import { Timestamp, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from './firebase';
import { getEuropeanGatheringUploadContentType, validateEuropeanGatheringUploadFile } from './europeanGatheringUpload';
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
  phone?: string;
  mobile?: string;
  avatarUrl?: string;
  memberId?: string;
  surname?: string;
  firstName?: string;
  fullName?: string;
  fiscalCode?: string;
  sex?: string;
  birthDate?: string;
  birthPlace?: string;
  birthProvince?: string;
  birthCountry?: string;
  city?: string;
  state?: string;
  province?: string;
  region?: string;
  country?: string;
  citizenship?: string;
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
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

export type UserApprovalStatus = 'needs-profile' | 'pending' | 'approved' | 'needs-info';

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

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
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
    phone: asOptionalString(data.phone),
    mobile: asOptionalString(data.mobile),
    avatarUrl: asOptionalString(data.avatarUrl),
    memberId: asOptionalString(data.memberId),
    surname: asOptionalString(data.surname),
    firstName: asOptionalString(data.firstName),
    fullName: asOptionalString(data.fullName),
    fiscalCode: asOptionalString(data.fiscalCode),
    sex: asOptionalString(data.sex),
    birthDate: asOptionalString(data.birthDate),
    birthPlace: asOptionalString(data.birthPlace),
    birthProvince: asOptionalString(data.birthProvince),
    birthCountry: asOptionalString(data.birthCountry),
    city: asOptionalString(data.city),
    state: asOptionalString(data.state),
    province: asOptionalString(data.province),
    region: asOptionalString(data.region),
    country: asOptionalString(data.country),
    citizenship: asOptionalString(data.citizenship),
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
    email2: data.email2,
    phone: data.phone,
    mobile: data.mobile,
    avatarUrl: data.avatarUrl,
    memberId: data.memberId,
    surname: data.surname,
    firstName: data.firstName,
    fullName: data.fullName,
    fiscalCode: data.fiscalCode,
    sex: data.sex,
    birthDate: data.birthDate,
    birthPlace: data.birthPlace,
    birthProvince: data.birthProvince,
    birthCountry: data.birthCountry,
    city: data.city,
    state: data.state,
    province: data.province,
    region: data.region,
    country: data.country,
    citizenship: data.citizenship,
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
    currentChurchId: data.currentChurchId,
    currentChurchName: data.currentChurchName,
    originChurchName: data.originChurchName,
    isInitiated: data.isInitiated,
    initiationDate: data.initiationDate,
    initiationVenue: data.initiationVenue,
    initiationChurchId: data.initiationChurchId,
    initiationChurchName: data.initiationChurchName,
    initiatorName: data.initiatorName,
    initiatedWith: data.initiatedWith,
    isSponsor: data.isSponsor,
    sponsorChurchIds: data.sponsorChurchIds,
    sponsorChurchNames: data.sponsorChurchNames,
    doctrineRoles: data.doctrineRoles,
    observations: data.observations,
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

export async function resolveUserDocumentUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}

export async function uploadUserIdentityDocument(uid: string, file: File) {
  const validationError = validateEuropeanGatheringUploadFile(file);
  if (validationError === 'invalid-type') {
    throw new Error('Only PDF, JPG, and PNG files are allowed.');
  }

  if (validationError === 'file-too-large') {
    throw new Error('Uploaded files must be 10 MB or smaller.');
  }

  const storagePath = `users/${uid}/identityDocument-${Date.now()}-${sanitizeFileName(file.name)}`;
  await uploadBytes(ref(storage, storagePath), file, { contentType: getEuropeanGatheringUploadContentType(file) });
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
