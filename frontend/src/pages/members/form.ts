import {
  MEMBER_TEXT_FIELDS,
  type MemberConflicts,
  type MemberCertificate,
  type MemberPatch,
  type MemberRecord,
  type MemberSource,
  type MemberTextField
} from '../../lib/members';

// Informational review tags that are kept across edits (provenance, not actionable conflicts).
const STICKY_REVIEW_REASONS = ['duplicate-in-importer', 'certificate-only'];

/** Portuguese labels for the spreadsheet-derived fields shown in the admin UI. */
export const MEMBER_FIELD_LABELS: Record<MemberTextField, string> = {
  surname: 'Sobrenome',
  firstName: 'Nome',
  fullName: 'Nome completo',
  fiscalCode: 'Codice Fiscale',
  sex: 'Sexo',
  birthDate: 'Nascimento',
  birthPlace: 'Local de nascimento',
  birthProvince: 'Província de nascimento',
  birthCountry: 'País de nascimento',
  email: 'E-mail',
  email2: 'E-mail 2',
  phone: 'Telefone',
  mobile: 'Celular',
  address: 'Endereço',
  postalCode: 'CEP/CAP',
  city: 'Cidade',
  province: 'Província',
  region: 'Região',
  country: 'País',
  memberCode: 'Código de sócio',
  memberStatus: 'Situação',
  group: 'Grupo',
  category: 'Categoria',
  cardNumber: 'Carteirinha',
  cardExpiry: 'Validade da carteirinha',
  referenceSeat: 'Sede de referência',
  originSociety: 'Sociedade de origem',
  profession: 'Profissão',
  nationality: 'Nacionalidade',
  citizenship: 'Cidadania',
  registrationRequestDate: 'Data do pedido',
  registrationDate: 'Data de inscrição',
  renewalDate: 'Data de renovação',
  cancellationDate: 'Data de cancelamento',
  firstWorkDate: 'Primeiro Trabalho'
};

export function fieldLabel(field: string): string {
  return MEMBER_FIELD_LABELS[field as MemberTextField] ?? field;
}

export function formatFullName(record: Pick<MemberRecord, 'fullName' | 'surname' | 'firstName'>): string {
  if (record.fullName) return record.fullName;
  return [record.surname, record.firstName].filter(Boolean).join(' ').trim();
}

function normValue(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

/** Recompute review state from current conflicts / possible duplicates / sticky tags. */
export function summarizeReview(
  record: Pick<MemberRecord, 'conflicts' | 'possibleDuplicateIds' | 'reviewReasons'>
): { needsReview: boolean; reviewReasons: string[] } {
  const reasons: string[] = [];
  if (Object.keys(record.conflicts ?? {}).length) reasons.push('field-conflict');
  if ((record.possibleDuplicateIds ?? []).length) reasons.push('possible-duplicate');
  for (const sticky of STICKY_REVIEW_REASONS) {
    if (record.reviewReasons?.includes(sticky)) reasons.push(sticky);
  }
  const needsReview =
    reasons.includes('field-conflict')
    || reasons.includes('possible-duplicate')
    || reasons.includes('certificate-only');
  return { needsReview, reviewReasons: reasons };
}

/** Pick a winning value for a conflicting field and drop the conflict. */
export function applyConflictResolution(record: MemberRecord, field: string, value: string): MemberPatch {
  const conflicts: MemberConflicts = { ...record.conflicts };
  delete conflicts[field];
  const review = summarizeReview({
    conflicts,
    possibleDuplicateIds: record.possibleDuplicateIds,
    reviewReasons: record.reviewReasons
  });
  return {
    [field]: value,
    conflicts,
    reviewReasons: review.reviewReasons,
    needsReview: review.needsReview
  };
}

function unionSources(target: MemberSource[], source: MemberSource[]): MemberSource[] {
  const seen = new Set<string>();
  const out: MemberSource[] = [];
  for (const entry of [...target, ...source]) {
    const key = `${entry.file}:${entry.code ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function unionCertificates(target: MemberCertificate[], source: MemberCertificate[]): MemberCertificate[] {
  const seen = new Set<string>();
  const out: MemberCertificate[] = [];
  for (const cert of [...target, ...source]) {
    const key = cert.code ?? `${cert.type ?? ''}|${cert.date ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cert);
  }
  return out;
}

/**
 * Merge `source` into `target`. Target values win; gaps are filled from source;
 * genuinely different values are recorded as conflicts for later resolution.
 * Returns the patch to apply to the target (the source doc is then deleted).
 */
export function mergeMemberRecords(target: MemberRecord, source: MemberRecord): MemberPatch {
  const patch: MemberPatch = {};
  const conflicts: MemberConflicts = { ...target.conflicts };

  for (const field of MEMBER_TEXT_FIELDS) {
    const targetValue = target[field];
    const sourceValue = source[field];
    if (!sourceValue) continue;
    if (!targetValue) {
      patch[field] = sourceValue; // fill the gap
    } else if (normValue(targetValue) !== normValue(sourceValue)) {
      const existing = conflicts[field] ?? [targetValue];
      if (!existing.some(value => normValue(value) === normValue(sourceValue))) existing.push(sourceValue);
      conflicts[field] = existing;
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
  patch.possibleDuplicateIds = possibleDuplicateIds;
  patch.sources = unionSources(target.sources, source.sources);
  patch.certificates = unionCertificates(target.certificates, source.certificates);
  patch.reviewReasons = review.reviewReasons;
  patch.needsReview = review.needsReview;

  // Keep the earliest first-work date.
  if (source.firstWorkDate && (!target.firstWorkDate || source.firstWorkDate < target.firstWorkDate)) {
    patch.firstWorkDate = source.firstWorkDate;
  }

  return patch;
}
