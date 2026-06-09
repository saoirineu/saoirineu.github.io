import {
  MEMBER_TEXT_FIELDS,
  type MemberConflicts,
  type MemberPatch,
  type MemberRecord,
  type MemberSource,
  type MemberSuperseeded,
  type MemberTextField
} from '../../lib/members';

const INFORMATIONAL_REVIEW_REASONS = ['duplicate-in-importer'];
const DUPLICATE_REVIEW_REASONS = ['family-email', 'possible-duplicate'];
const ACTIONABLE_PERSISTED_REVIEW_REASONS = ['certificate-only'];
const DERIVED_REVIEW_REASONS = ['field-conflict', ...DUPLICATE_REVIEW_REASONS];

export function formatFullName(record: Pick<MemberRecord, 'fullName' | 'surname' | 'firstName'>): string {
  if (record.fullName) return record.fullName;
  return [record.surname, record.firstName].filter(Boolean).join(' ').trim();
}

export type DuplicateReason =
  | { kind: 'email'; value: string }
  | { kind: 'family-email'; value: string }
  | { kind: 'name-birthdate' }
  | { kind: 'other' };

export type MergePreviewField = {
  field: MemberTextField;
  targetValue: string;
  sourceValue: string;
  chosenValue: string;
  chosenFrom: 'target' | 'source';
};

export type MergePlan = {
  patch: MemberPatch;
  overwrittenFields: MergePreviewField[];
  preferredRecord: 'target' | 'source';
};

function normEmailValue(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function normNameValue(value?: string): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function nameTokens(value?: string): string[] {
  const normalized = normNameValue(value);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

function typoLimit(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  return maxLength >= 8 ? 2 : 1;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const next = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i += 1) {
    next[0] = i + 1;
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      next[j + 1] = Math.min(
        next[j] + 1,
        prev[j + 1] + 1,
        prev[j] + cost
      );
    }
    for (let j = 0; j < prev.length; j += 1) prev[j] = next[j];
  }

  return prev[b.length];
}

function tokensMatchWithTypos(aTokens: string[], bTokens: string[]): boolean {
  return aTokens.length === bTokens.length
    && aTokens.every((token, index) => editDistance(token, bTokens[index]) <= typoLimit(token, bTokens[index]));
}

function tokensShareLeadingSequence(aTokens: string[], bTokens: string[]): boolean {
  if (aTokens.length === bTokens.length) return false;
  const shorter = aTokens.length < bTokens.length ? aTokens : bTokens;
  const longer = aTokens.length < bTokens.length ? bTokens : aTokens;
  return shorter.length > 0
    && shorter.every((token, index) => editDistance(token, longer[index]) <= typoLimit(token, longer[index]));
}

function similarNameField(a?: string, b?: string, allowLeadingExtraTokens = false): boolean {
  const normalizedA = normNameValue(a);
  const normalizedB = normNameValue(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;
  if (editDistance(normalizedA, normalizedB) <= typoLimit(normalizedA, normalizedB)) return true;

  const aTokens = nameTokens(a);
  const bTokens = nameTokens(b);
  if (tokensMatchWithTypos(aTokens, bTokens)) return true;
  return allowLeadingExtraTokens && tokensShareLeadingSequence(aTokens, bTokens);
}

function namesLikelySamePerson(member: Pick<MemberRecord, 'surname' | 'firstName'>, candidate: Pick<MemberRecord, 'surname' | 'firstName'>): boolean {
  return similarNameField(member.surname, candidate.surname)
    && similarNameField(member.firstName, candidate.firstName, true);
}

/**
 * Explains why two members were linked as possible duplicates, mirroring the
 * build's linking rules (shared primary email, or same name + birth date).
 */
export function duplicateReason(member: MemberRecord, candidate: MemberRecord): DuplicateReason {
  const memberEmail = normEmailValue(member.email);
  if (memberEmail && memberEmail === normEmailValue(candidate.email)) {
    if (!namesLikelySamePerson(member, candidate)) {
      return { kind: 'family-email', value: member.email ?? '' };
    }
    return { kind: 'email', value: member.email ?? '' };
  }
  const sameName =
    normNameValue(member.surname) === normNameValue(candidate.surname)
    && normNameValue(member.firstName) === normNameValue(candidate.firstName);
  if (sameName && member.birthDate && member.birthDate === candidate.birthDate) {
    return { kind: 'name-birthdate' };
  }
  return { kind: 'other' };
}

function normValue(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function recordRecency(record: Pick<MemberRecord, 'registrationDate' | 'registrationRequestDate'>): string {
  return record.registrationDate ?? record.registrationRequestDate ?? '';
}

function recordSequence(record: Pick<MemberRecord, 'sources'>): number {
  return record.sources.reduce((latest, source, index) => {
    if (typeof source.line === 'number' && Number.isFinite(source.line)) return Math.max(latest, source.line);
    const numericCode = Number(source.code);
    if (Number.isFinite(numericCode)) return Math.max(latest, numericCode);
    return Math.max(latest, index + 1);
  }, 0);
}

function preferredMergeRecord(target: MemberRecord, source: MemberRecord): 'target' | 'source' {
  const targetRecency = recordRecency(target);
  const sourceRecency = recordRecency(source);
  if (sourceRecency > targetRecency) return 'source';
  if (sourceRecency < targetRecency) return 'target';
  return recordSequence(source) > recordSequence(target) ? 'source' : 'target';
}

function rememberSuperseeded(store: MemberSuperseeded, field: string, values: string[], winner?: string): void {
  const existing = store[field] ?? [];
  for (const value of values) {
    if (winner && normValue(value) === normValue(winner)) continue;
    if (existing.some(current => normValue(current) === normValue(value))) continue;
    existing.push(value);
  }
  if (existing.length) store[field] = existing;
}

function preservedReviewReasons(reviewReasons: string[]): string[] {
  return reviewReasons.filter(reason => !DERIVED_REVIEW_REASONS.includes(reason));
}

function duplicateReviewReason(member: MemberRecord, candidate: MemberRecord): 'family-email' | 'possible-duplicate' {
  return duplicateReason(member, candidate).kind === 'family-email' ? 'family-email' : 'possible-duplicate';
}

function duplicateReviewReasons(record: MemberRecord, duplicateCandidates: MemberRecord[]): string[] {
  const reasons = new Set<string>(preservedReviewReasons(record.reviewReasons));
  for (const candidate of duplicateCandidates) reasons.add(duplicateReviewReason(record, candidate));
  return [...reasons];
}

/** Recompute review state from current conflicts / possible duplicates / sticky tags. */
export function summarizeReview(
  record: Pick<MemberRecord, 'conflicts' | 'possibleDuplicateIds' | 'reviewReasons'>
): { needsReview: boolean; reviewReasons: string[] } {
  const reasons: string[] = [];
  if (Object.keys(record.conflicts ?? {}).length) reasons.push('field-conflict');
  if ((record.possibleDuplicateIds ?? []).length) {
    const duplicateReasons = DUPLICATE_REVIEW_REASONS.filter(reason => record.reviewReasons?.includes(reason));
    reasons.push(...(duplicateReasons.length ? duplicateReasons : ['possible-duplicate']));
  }
  for (const sticky of INFORMATIONAL_REVIEW_REASONS) {
    if (record.reviewReasons?.includes(sticky)) reasons.push(sticky);
  }
  for (const persistent of ACTIONABLE_PERSISTED_REVIEW_REASONS) {
    if (record.reviewReasons?.includes(persistent)) reasons.push(persistent);
  }
  const needsReview =
    reasons.includes('field-conflict')
    || reasons.includes('possible-duplicate')
    || reasons.includes('family-email')
    || reasons.includes('certificate-only');
  return { needsReview, reviewReasons: reasons };
}

/** Pick a winning value for a conflicting field and drop the conflict. */
export function applyConflictResolution(record: MemberRecord, field: string, value: string): MemberPatch {
  const conflicts: MemberConflicts = { ...record.conflicts };
  const superseeded: MemberSuperseeded = { ...record.superseeded };
  rememberSuperseeded(superseeded, field, record.conflicts[field] ?? [], value);
  delete conflicts[field];
  const review = summarizeReview({
    conflicts,
    possibleDuplicateIds: record.possibleDuplicateIds,
    reviewReasons: record.reviewReasons
  });
  return {
    [field]: value,
    conflicts,
    superseeded,
    reviewReasons: review.reviewReasons,
    needsReview: review.needsReview
  };
}

export function dismissDuplicateLink(args: {
  member: MemberRecord;
  candidate: MemberRecord;
  allMembers: MemberRecord[];
}): { memberPatch: MemberPatch; candidatePatch: MemberPatch } {
  const byId = new Map(args.allMembers.map(member => [member.id, member]));
  const buildPatch = (record: MemberRecord, otherId: string): MemberPatch => {
    const possibleDuplicateIds = record.possibleDuplicateIds.filter(id => id !== otherId);
    const remainingCandidates = possibleDuplicateIds
      .map(id => byId.get(id))
      .filter((candidate): candidate is MemberRecord => Boolean(candidate));
    const reviewReasons = duplicateReviewReasons(record, remainingCandidates);
    const review = summarizeReview({
      conflicts: record.conflicts,
      possibleDuplicateIds,
      reviewReasons
    });
    return {
      possibleDuplicateIds,
      reviewReasons: review.reviewReasons,
      needsReview: review.needsReview
    };
  };

  return {
    memberPatch: buildPatch(args.member, args.candidate.id),
    candidatePatch: buildPatch(args.candidate, args.member.id)
  };
}

function unionSources(target: MemberSource[], source: MemberSource[]): MemberSource[] {
  const seen = new Set<string>();
  const out: MemberSource[] = [];
  for (const entry of [...target, ...source]) {
    const key = `${entry.file}:${entry.code ?? entry.line ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

/**
 * Merge `source` into `target`, preferring the most recent record when both
 * carry different values for the same field. Replaced values are preserved in
 * `superseeded`, and the returned patch is applied to the target before the
 * source doc is deleted.
 */
export function previewMemberMerge(target: MemberRecord, source: MemberRecord): MergePlan {
  const patch: MemberPatch = {};
  const conflicts: MemberConflicts = { ...target.conflicts };
  const superseeded: MemberSuperseeded = { ...target.superseeded };
  const overwrittenFields: MergePreviewField[] = [];
  const preferredRecord = preferredMergeRecord(target, source);

  for (const [field, values] of Object.entries(source.superseeded ?? {})) {
    rememberSuperseeded(superseeded, field, values);
  }

  for (const field of MEMBER_TEXT_FIELDS) {
    const targetValue = target[field];
    const sourceValue = source[field];
    if (!sourceValue) continue;
    if (!targetValue) {
      patch[field] = sourceValue; // fill the gap
    } else if (normValue(targetValue) !== normValue(sourceValue)) {
      const chosenFrom = preferredRecord;
      const chosenValue = chosenFrom === 'source' ? sourceValue : targetValue;
      const replacedValue = chosenFrom === 'source' ? targetValue : sourceValue;
      overwrittenFields.push({
        field,
        targetValue,
        sourceValue,
        chosenValue,
        chosenFrom
      });
      rememberSuperseeded(superseeded, field, [replacedValue], chosenValue);
      if (chosenFrom === 'source') patch[field] = sourceValue;
    }
  }

  // Fold in any conflicts the source already carried.
  for (const [field, values] of Object.entries(source.conflicts ?? {})) {
    const existing = conflicts[field] ?? (target[field as MemberTextField] ? [target[field as MemberTextField] as string] : []);
    for (const value of values) {
      if (!existing.some(current => normValue(current) === normValue(value))) existing.push(value);
    }
    if (existing.length > 1) conflicts[field] = existing;
  }

  const possibleDuplicateIds = [...new Set([...target.possibleDuplicateIds, ...source.possibleDuplicateIds])].filter(
    id => id !== target.id && id !== source.id
  );

  const reviewReasons = [...new Set([...target.reviewReasons, ...source.reviewReasons])];
  const review = summarizeReview({ conflicts, possibleDuplicateIds, reviewReasons });

  patch.conflicts = conflicts;
  patch.superseeded = superseeded;
  patch.possibleDuplicateIds = possibleDuplicateIds;
  patch.sources = unionSources(target.sources, source.sources);
  patch.reviewReasons = review.reviewReasons;
  patch.needsReview = review.needsReview;

  // Keep the earliest first-work date.
  if (source.firstWorkDate && (!target.firstWorkDate || source.firstWorkDate < target.firstWorkDate)) {
    patch.firstWorkDate = source.firstWorkDate;
  }

  return {
    patch,
    overwrittenFields,
    preferredRecord
  };
}

export function mergeMemberRecords(target: MemberRecord, source: MemberRecord): MemberPatch {
  return previewMemberMerge(target, source).patch;
}
