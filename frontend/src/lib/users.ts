import { addDoc, Timestamp, collection, deleteField, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { getUploadContentType, validateUploadFile } from './uploads';
import {
  asOptionalBoolean,
  asOptionalString,
  asOptionalTimestamp,
  asRecord,
  asStringArray,
  removeUndefinedDeep
} from './firestoreData';
import { fetchMembersByEmail, type MemberRecord } from './members';
import { normalizeSystemRole, normalizeSystemRoles, primarySystemRole, type SystemRole } from './systemRole';
import {
  buildUserProfileLoginPayload,
  selectMemberForProfilePrefill,
  type AuthProfileUser
} from './userProfileSeed';

export type UserProfile = {
  uid: string;
  systemRole?: SystemRole;
  systemRoles?: SystemRole[];
  approvalStatus?: UserApprovalStatus;
  approvalSubmittedAt?: Timestamp;
  approvalApprovedAt?: Timestamp;
  approvalApprovedBy?: string;
  displayName?: string;
  email?: string;
  email2?: string;
  preferredCommunicationEmail?: PreferredCommunicationEmail;
  phone?: string;
  mobile?: string;
  avatarUrl?: string;
  isItalian?: boolean;
  privacyConsent?: string;
  declarationConsent?: string;
  memberId?: string;
  surname?: string;
  firstName?: string;
  fullName?: string;
  fiscalCode?: string;
  sex?: string;
  gender?: string;
  genderSelfDescription?: string;
  birthDate?: string;
  birthPlace?: string;
  birthPlaceCode?: string;
  birthProvince?: string;
  birthProvinceCode?: string;
  birthCountry?: string;
  birthCountryCode?: string;
  city?: string;
  state?: string;
  province?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  citizenship?: string;
  citizenshipCountryCodes?: string[];
  nationality?: string;
  address?: string;
  postalCode?: string;
  profession?: string;
  memberCode?: string;
  memberStatus?: string;
  group?: string;
  category?: string;
  cardNumber?: string;
  cardExpiry?: string;
  referenceSeat?: string;
  originSociety?: string;
  registrationRequestDate?: string;
  registrationDate?: string;
  renewalDate?: string;
  cancellationDate?: string;
  firstWorkDate?: string;
  identityDocumentPrimaryName?: string;
  identityDocumentPrimaryPath?: string;
  identityDocumentSecondaryName?: string;
  identityDocumentSecondaryPath?: string;
  membershipFeeAmount?: string;
  currentChurchId?: string;
  currentChurchName?: string;
  originChurchName?: string;
  isInitiated?: boolean;
  initiationDate?: string;
  initiationVenue?: string;
  initiationChurchId?: string;
  initiationChurchName?: string;
  initiatorName?: string;
  initiatedWith?: string;
  isSponsor?: boolean;
  sponsorChurchIds?: string[];
  sponsorChurchNames?: string[];
  doctrineRoles?: string[];
  observations?: string;
  adminNote?: string;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

export type UserApprovalStatus = 'needs-profile' | 'pending' | 'approved' | 'needs-info';
export type PreferredCommunicationEmail = 'login' | 'secondary';

const usersRef = collection(db, 'users');

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeUserApprovalStatus(value: unknown): UserApprovalStatus | undefined {
  if (value === 'approved') return 'approved';
  if (value === 'pending') return 'pending';
  if (value === 'needs-info') return 'needs-info';
  if (value === 'needs-profile') return 'needs-profile';
  return undefined;
}

function normalizePreferredCommunicationEmail(value: unknown): PreferredCommunicationEmail | undefined {
  if (value === 'login' || value === 'secondary') return value;
  return undefined;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function hasOwnField<T extends object>(value: T, field: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function mapUserProfile(uid: string, value: unknown): UserProfile {
  const data = asRecord(value);
  return {
    uid,
    systemRole: normalizeSystemRole(data.systemRole),
    systemRoles: normalizeSystemRoles(data.systemRoles, data.systemRole),
    approvalStatus: normalizeUserApprovalStatus(data.approvalStatus),
    approvalSubmittedAt: asOptionalTimestamp(data.approvalSubmittedAt) ?? undefined,
    approvalApprovedAt: asOptionalTimestamp(data.approvalApprovedAt) ?? undefined,
    approvalApprovedBy: asOptionalString(data.approvalApprovedBy),
    displayName: asOptionalString(data.displayName),
    email: asOptionalString(data.email),
    email2: asOptionalString(data.email2),
    preferredCommunicationEmail: normalizePreferredCommunicationEmail(data.preferredCommunicationEmail),
    phone: asOptionalString(data.phone),
    mobile: asOptionalString(data.mobile),
    avatarUrl: asOptionalString(data.avatarUrl),
    isItalian: asOptionalBoolean(data.isItalian),
    privacyConsent: asOptionalString(data.privacyConsent),
    declarationConsent: asOptionalString(data.declarationConsent),
    memberId: asOptionalString(data.memberId),
    surname: asOptionalString(data.surname),
    firstName: asOptionalString(data.firstName),
    fullName: asOptionalString(data.fullName),
    fiscalCode: asOptionalString(data.fiscalCode),
    sex: asOptionalString(data.sex),
    gender: asOptionalString(data.gender),
    genderSelfDescription: asOptionalString(data.genderSelfDescription),
    birthDate: asOptionalString(data.birthDate),
    birthPlace: asOptionalString(data.birthPlace),
    birthPlaceCode: asOptionalString(data.birthPlaceCode),
    birthProvince: asOptionalString(data.birthProvince),
    birthProvinceCode: asOptionalString(data.birthProvinceCode),
    birthCountry: asOptionalString(data.birthCountry),
    birthCountryCode: asOptionalString(data.birthCountryCode),
    city: asOptionalString(data.city),
    state: asOptionalString(data.state),
    province: asOptionalString(data.province),
    region: asOptionalString(data.region),
    country: asOptionalString(data.country),
    countryCode: asOptionalString(data.countryCode),
    citizenship: asOptionalString(data.citizenship),
    citizenshipCountryCodes: asStringArray(data.citizenshipCountryCodes),
    nationality: asOptionalString(data.nationality),
    address: asOptionalString(data.address),
    postalCode: asOptionalString(data.postalCode),
    profession: asOptionalString(data.profession),
    memberCode: asOptionalString(data.memberCode),
    memberStatus: asOptionalString(data.memberStatus),
    group: asOptionalString(data.group),
    category: asOptionalString(data.category),
    cardNumber: asOptionalString(data.cardNumber),
    cardExpiry: asOptionalString(data.cardExpiry),
    referenceSeat: asOptionalString(data.referenceSeat),
    originSociety: asOptionalString(data.originSociety),
    registrationRequestDate: asOptionalString(data.registrationRequestDate),
    registrationDate: asOptionalString(data.registrationDate),
    renewalDate: asOptionalString(data.renewalDate),
    cancellationDate: asOptionalString(data.cancellationDate),
    firstWorkDate: asOptionalString(data.firstWorkDate),
    identityDocumentPrimaryName: asOptionalString(data.identityDocumentPrimaryName),
    identityDocumentPrimaryPath: asOptionalString(data.identityDocumentPrimaryPath),
    identityDocumentSecondaryName: asOptionalString(data.identityDocumentSecondaryName),
    identityDocumentSecondaryPath: asOptionalString(data.identityDocumentSecondaryPath),
    membershipFeeAmount: asOptionalString(data.membershipFeeAmount),
    currentChurchId: asOptionalString(data.currentChurchId),
    currentChurchName: asOptionalString(data.currentChurchName),
    originChurchName: asOptionalString(data.originChurchName),
    isInitiated: asOptionalBoolean(data.isInitiated),
    initiationDate: asOptionalString(data.initiationDate),
    initiationVenue: asOptionalString(data.initiationVenue),
    initiationChurchId: asOptionalString(data.initiationChurchId),
    initiationChurchName: asOptionalString(data.initiationChurchName),
    initiatorName: asOptionalString(data.initiatorName),
    initiatedWith: asOptionalString(data.initiatedWith),
    isSponsor: asOptionalBoolean(data.isSponsor),
    sponsorChurchIds: asStringArray(data.sponsorChurchIds),
    sponsorChurchNames: asStringArray(data.sponsorChurchNames),
    doctrineRoles: asStringArray(data.doctrineRoles),
    observations: asOptionalString(data.observations),
    adminNote: asOptionalString(data.adminNote),
    updatedAt: asOptionalTimestamp(data.updatedAt) ?? undefined,
    createdAt: asOptionalTimestamp(data.createdAt) ?? undefined
  };
}

export function isUserProfileReadyForApproval(profile: Partial<UserProfile>) {
  const hasName = hasText(profile.fullName) || hasText(profile.displayName) || (hasText(profile.firstName) && hasText(profile.surname));
  return hasName && hasText(profile.email) && hasText(profile.identityDocumentPrimaryPath);
}

export function nextUserApprovalStatus(profile: Partial<UserProfile>, currentStatus?: UserApprovalStatus): UserApprovalStatus {
  if (currentStatus === 'approved') return 'approved';
  if (isUserProfileReadyForApproval(profile)) return 'pending';
  if (currentStatus === 'pending') return 'pending';
  return 'needs-profile';
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(docSnap => mapUserProfile(docSnap.id, docSnap.data()));
}

/** Distinct, non-empty "who initiated me" names already entered by any user. */
export async function fetchInitiatorNames(): Promise<string[]> {
  const snapshot = await getDocs(usersRef);
  const names = new Set<string>();
  snapshot.docs.forEach(docSnap => {
    const name = docSnap.data().initiatorName;
    if (typeof name === 'string' && name.trim()) names.add(name.trim());
  });
  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

export async function fetchUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(usersRef, uid));
  if (!snap.exists()) return null;
  return mapUserProfile(uid, snap.data());
}

export async function upsertUser(uid: string, data: Partial<UserProfile>) {
  const ref = doc(usersRef, uid);

  const firestorePayload = {
    uid,
    systemRole: data.systemRole,
    systemRoles: data.systemRoles,
    approvalStatus: data.approvalStatus,
    approvalSubmittedAt: data.approvalSubmittedAt,
    approvalApprovedAt: data.approvalApprovedAt,
    approvalApprovedBy: data.approvalApprovedBy,
    displayName: data.displayName,
    email: data.email,
    email2: hasOwnField(data, 'email2') ? data.email2 ?? deleteField() : undefined,
    preferredCommunicationEmail: data.preferredCommunicationEmail,
    phone: data.phone,
    mobile: data.mobile,
    avatarUrl: data.avatarUrl,
    isItalian: data.isItalian,
    privacyConsent: data.privacyConsent,
    declarationConsent: data.declarationConsent,
    memberId: data.memberId,
    surname: data.surname,
    firstName: data.firstName,
    fullName: data.fullName,
    fiscalCode: data.fiscalCode,
    sex: data.sex,
    gender: hasOwnField(data, 'gender') ? data.gender ?? deleteField() : undefined,
    genderSelfDescription: hasOwnField(data, 'genderSelfDescription') ? data.genderSelfDescription ?? deleteField() : undefined,
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    birthPlaceCode: hasOwnField(data, 'birthPlaceCode') ? data.birthPlaceCode ?? deleteField() : undefined,
    birthProvince: data.birthProvince,
    birthProvinceCode: hasOwnField(data, 'birthProvinceCode') ? data.birthProvinceCode ?? deleteField() : undefined,
    birthCountry: data.birthCountry,
    birthCountryCode: hasOwnField(data, 'birthCountryCode') ? data.birthCountryCode ?? deleteField() : undefined,
    city: data.city,
    state: data.state,
    province: data.province,
    region: data.region,
    country: data.country,
    countryCode: hasOwnField(data, 'countryCode') ? data.countryCode ?? deleteField() : undefined,
    citizenship: data.citizenship,
    citizenshipCountryCodes: hasOwnField(data, 'citizenshipCountryCodes') ? data.citizenshipCountryCodes ?? deleteField() : undefined,
    nationality: data.nationality,
    address: data.address,
    postalCode: data.postalCode,
    profession: data.profession,
    memberCode: data.memberCode,
    memberStatus: data.memberStatus,
    group: data.group,
    category: data.category,
    cardNumber: data.cardNumber,
    cardExpiry: data.cardExpiry,
    referenceSeat: data.referenceSeat,
    originSociety: data.originSociety,
    registrationRequestDate: data.registrationRequestDate,
    registrationDate: data.registrationDate,
    renewalDate: data.renewalDate,
    cancellationDate: data.cancellationDate,
    firstWorkDate: data.firstWorkDate,
    identityDocumentPrimaryName: data.identityDocumentPrimaryName,
    identityDocumentPrimaryPath: data.identityDocumentPrimaryPath,
    identityDocumentSecondaryName: data.identityDocumentSecondaryName,
    identityDocumentSecondaryPath: data.identityDocumentSecondaryPath,
    membershipFeeAmount: data.membershipFeeAmount,
    currentChurchId: hasOwnField(data, 'currentChurchId') ? data.currentChurchId ?? deleteField() : undefined,
    currentChurchName: hasOwnField(data, 'currentChurchName') ? data.currentChurchName ?? deleteField() : undefined,
    originChurchName: hasOwnField(data, 'originChurchName') ? data.originChurchName ?? deleteField() : undefined,
    isInitiated: data.isInitiated,
    initiationDate: data.initiationDate,
    initiationVenue: data.initiationVenue,
    initiationChurchId: data.initiationChurchId,
    initiationChurchName: data.initiationChurchName,
    initiatorName: data.initiatorName,
    initiatedWith: data.initiatedWith,
    isSponsor: data.isSponsor,
    sponsorChurchIds: hasOwnField(data, 'sponsorChurchIds') ? data.sponsorChurchIds ?? deleteField() : undefined,
    sponsorChurchNames: hasOwnField(data, 'sponsorChurchNames') ? data.sponsorChurchNames ?? deleteField() : undefined,
    doctrineRoles: hasOwnField(data, 'doctrineRoles') ? data.doctrineRoles ?? deleteField() : undefined,
    observations: data.observations,
    adminNote: data.adminNote,
    updatedAt: Timestamp.now()
  };

  const payload = removeUndefinedDeep(firestorePayload);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    (payload as Record<string, unknown>).createdAt = Timestamp.now();
  }

  return setDoc(ref, payload, { merge: true });
}

export async function updateUserSystemRole(uid: string, systemRole: SystemRole) {
  return updateUserSystemRoles(uid, systemRole === 'user' ? ['user'] : [systemRole]);
}

export async function updateUserSystemRoles(uid: string, systemRoles: SystemRole[]) {
  const normalizedRoles = normalizeSystemRoles(systemRoles);
  return upsertUser(uid, {
    systemRole: primarySystemRole(normalizedRoles),
    systemRoles: normalizedRoles
  });
}

export async function updateUserApprovalStatus(uid: string, status: UserApprovalStatus, reviewerUid: string) {
  return upsertUser(uid, {
    approvalStatus: status,
    approvalApprovedAt: status === 'approved' ? Timestamp.now() : undefined,
    approvalApprovedBy: status === 'approved' ? reviewerUid : undefined
  });
}

export type ApprovedProfileSnapshot = {
  snapshotId: string;
  uid: string;
  approvedAt: Timestamp;
  approvedBy: string;
  displayName?: string;
  email?: string;
  email2?: string;
  preferredCommunicationEmail?: PreferredCommunicationEmail;
  phone?: string;
  mobile?: string;
  firstName?: string;
  surname?: string;
  fullName?: string;
  fiscalCode?: string;
  sex?: string;
  gender?: string;
  genderSelfDescription?: string;
  birthDate?: string;
  birthPlace?: string;
  birthPlaceCode?: string;
  birthCountry?: string;
  birthCountryCode?: string;
  citizenship?: string;
  citizenshipCountryCodes?: string[];
  nationality?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  currentChurchName?: string;
  originChurchName?: string;
  isInitiated?: boolean;
  initiationDate?: string;
  initiatorName?: string;
  identityDocumentPrimaryName?: string;
  identityDocumentPrimaryPath?: string;
};

function approvedSnapshotsRef(uid: string) {
  return collection(db, 'users', uid, 'approvedSnapshots');
}

function mapApprovedSnapshot(id: string, value: unknown): ApprovedProfileSnapshot {
  const data = asRecord(value);
  return {
    snapshotId: id,
    uid: asOptionalString(data.uid) ?? '',
    approvedAt: asOptionalTimestamp(data.approvedAt) ?? Timestamp.now(),
    approvedBy: asOptionalString(data.approvedBy) ?? '',
    displayName: asOptionalString(data.displayName),
    email: asOptionalString(data.email),
    email2: asOptionalString(data.email2),
    preferredCommunicationEmail: normalizePreferredCommunicationEmail(data.preferredCommunicationEmail),
    phone: asOptionalString(data.phone),
    mobile: asOptionalString(data.mobile),
    firstName: asOptionalString(data.firstName),
    surname: asOptionalString(data.surname),
    fullName: asOptionalString(data.fullName),
    fiscalCode: asOptionalString(data.fiscalCode),
    sex: asOptionalString(data.sex),
    gender: asOptionalString(data.gender),
    genderSelfDescription: asOptionalString(data.genderSelfDescription),
    birthDate: asOptionalString(data.birthDate),
    birthPlace: asOptionalString(data.birthPlace),
    birthPlaceCode: asOptionalString(data.birthPlaceCode),
    birthCountry: asOptionalString(data.birthCountry),
    birthCountryCode: asOptionalString(data.birthCountryCode),
    citizenship: asOptionalString(data.citizenship),
    citizenshipCountryCodes: asStringArray(data.citizenshipCountryCodes),
    nationality: asOptionalString(data.nationality),
    address: asOptionalString(data.address),
    postalCode: asOptionalString(data.postalCode),
    city: asOptionalString(data.city),
    state: asOptionalString(data.state),
    country: asOptionalString(data.country),
    currentChurchName: asOptionalString(data.currentChurchName),
    originChurchName: asOptionalString(data.originChurchName),
    isInitiated: asOptionalBoolean(data.isInitiated),
    initiationDate: asOptionalString(data.initiationDate),
    initiatorName: asOptionalString(data.initiatorName),
    identityDocumentPrimaryName: asOptionalString(data.identityDocumentPrimaryName),
    identityDocumentPrimaryPath: asOptionalString(data.identityDocumentPrimaryPath),
  };
}

export async function createApprovedSnapshot(uid: string, profile: UserProfile, approverUid: string): Promise<void> {
  const data = removeUndefinedDeep({
    uid,
    approvedAt: Timestamp.now(),
    approvedBy: approverUid,
    displayName: profile.displayName,
    email: profile.email,
    email2: profile.email2,
    preferredCommunicationEmail: profile.preferredCommunicationEmail,
    phone: profile.phone,
    mobile: profile.mobile,
    firstName: profile.firstName,
    surname: profile.surname,
    fullName: profile.fullName,
    fiscalCode: profile.fiscalCode,
    sex: profile.sex,
    gender: profile.gender,
    genderSelfDescription: profile.genderSelfDescription,
    birthDate: profile.birthDate,
    birthPlace: profile.birthPlace,
    birthPlaceCode: profile.birthPlaceCode,
    birthCountry: profile.birthCountry,
    birthCountryCode: profile.birthCountryCode,
    citizenship: profile.citizenship,
    citizenshipCountryCodes: profile.citizenshipCountryCodes,
    nationality: profile.nationality,
    address: profile.address,
    postalCode: profile.postalCode,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    currentChurchName: profile.currentChurchName,
    originChurchName: profile.originChurchName,
    isInitiated: profile.isInitiated,
    initiationDate: profile.initiationDate,
    initiatorName: profile.initiatorName,
    identityDocumentPrimaryName: profile.identityDocumentPrimaryName,
    identityDocumentPrimaryPath: profile.identityDocumentPrimaryPath,
  });
  await addDoc(approvedSnapshotsRef(uid), data);
}

export async function fetchApprovedSnapshots(uid: string): Promise<ApprovedProfileSnapshot[]> {
  const q = query(approvedSnapshotsRef(uid), orderBy('approvedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => mapApprovedSnapshot(docSnap.id, docSnap.data()));
}

export async function updateUserAdminNote(uid: string, note: string) {
  return setDoc(doc(usersRef, uid), { adminNote: note, updatedAt: Timestamp.now() }, { merge: true });
}

export async function resolveUserDocumentUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}

export async function uploadUserIdentityDocument(uid: string, file: File) {
  const validationError = validateUploadFile(file);
  if (validationError === 'invalid-type') {
    throw new Error('Only PDF, JPG, and PNG files are allowed.');
  }

  if (validationError === 'file-too-large') {
    throw new Error('Uploaded files must be 10 MB or smaller.');
  }

  const storagePath = `users/${uid}/identityDocument-${Date.now()}-${sanitizeFileName(file.name)}`;
  await uploadBytes(ref(storage, storagePath), file, { contentType: getUploadContentType(file) });
  return { name: file.name, path: storagePath };
}

export async function syncUserProfileForLogin(user: AuthProfileUser) {
  const existingProfile = await fetchUser(user.uid);
  let matchedMember: MemberRecord | undefined;

  if (user.email) {
    try {
      const candidates = await fetchMembersByEmail(user.email);
      matchedMember = selectMemberForProfilePrefill(candidates, user);
    } catch {
      matchedMember = undefined;
    }
  }

  return upsertUser(user.uid, buildUserProfileLoginPayload(user, existingProfile, matchedMember));
}
