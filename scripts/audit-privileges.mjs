#!/usr/bin/env node
/**
 * Privilege and approval audit.
 *
 * Written after finding C3: for as long as the old rules were live, any signed-in
 * account could add systemRole/systemRoles to its own profile and become superadmin,
 * and any account could add approvalStatus: 'approved' to self-approve its ICEFLU
 * membership. Neither leaves a trace in the document beyond the field itself, so the
 * only way to check is to test the invariants a legitimate write would have left.
 *
 * A legitimate approval (updateUserApprovalStatus, from the membership review page)
 * writes approvalStatus + approvalApprovedAt + approvalApprovedBy together, and the
 * page also adds an approvedSnapshots document. A self-approval through the hole
 * would set the status alone.
 *
 * Read-only. Fetches only the role and approval fields, never the personal data.
 *
 * Usage:
 *   node scripts/audit-privileges.mjs                 (Application Default Credentials)
 *   GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/audit-privileges.mjs
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'sao-irineu';
const PRIVILEGED = ['useradmin', 'custodian', 'eventadmin', 'admin', 'superadmin'];

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({
  credential: credPath ? cert(credPath) : applicationDefault(),
  projectId: PROJECT_ID
});

const db = getFirestore();

function rolesOf(data) {
  const roles = new Set();
  if (typeof data.systemRole === 'string' && data.systemRole !== 'user') roles.add(data.systemRole);
  if (Array.isArray(data.systemRoles)) {
    data.systemRoles.forEach(role => {
      if (typeof role === 'string' && role !== 'user') roles.add(role);
    });
  }
  return [...roles];
}

const iso = value => (value?.toDate ? value.toDate().toISOString().slice(0, 19) : null);

const snapshot = await db
  .collection('users')
  .select(
    'email',
    'systemRole',
    'systemRoles',
    'approvalStatus',
    'approvalApprovedAt',
    'approvalApprovedBy',
    'approvalSubmittedAt',
    'createdAt',
    'updatedAt'
  )
  .get();

const users = snapshot.docs.map(doc => {
  const data = doc.data();
  return {
    uid: doc.id,
    // Server-maintained, not writable by any client: when the document was last
    // written at all. It cannot say WHAT changed — Data Access audit logs are off
    // by default, so there is no field-level history — but a privileged profile
    // last written on a date nobody recognises is worth a second look.
    docCreated: doc.createTime?.toDate().toISOString().slice(0, 10) ?? '?',
    docUpdated: doc.updateTime?.toDate().toISOString().slice(0, 10) ?? '?',
    email: data.email ?? '—',
    roles: rolesOf(data),
    approvalStatus: data.approvalStatus ?? null,
    approvedAt: iso(data.approvalApprovedAt),
    approvedBy: typeof data.approvalApprovedBy === 'string' ? data.approvalApprovedBy : null,
    submittedAt: iso(data.approvalSubmittedAt),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt)
  };
});

const byUid = new Map(users.map(user => [user.uid, user]));
const privilegedUids = new Set(users.filter(user => user.roles.length).map(user => user.uid));

// A reviewer must hold useradmin or superadmin for the approval to be legitimate.
const canApprove = uid => {
  const reviewer = byUid.get(uid);
  return !!reviewer && reviewer.roles.some(role => role === 'useradmin' || role === 'superadmin');
};

// Approved users should carry an approvedSnapshots document, written by the same
// review page. Absence is a signal, not proof — approvals predating that feature
// would also lack one.
const approved = users.filter(user => user.approvalStatus === 'approved');
const snapshotCounts = new Map();
for (const user of approved) {
  const snaps = await db.collection('users').doc(user.uid).collection('approvedSnapshots').count().get();
  snapshotCounts.set(user.uid, snaps.data().count);
}

let authRecords = new Map();
try {
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    page.users.forEach(record =>
      authRecords.set(record.uid, {
        created: record.metadata.creationTime,
        verified: record.emailVerified,
        providers: record.providerData.map(p => p.providerId).join(',')
      })
    );
    pageToken = page.pageToken;
  } while (pageToken);
} catch (error) {
  console.error('Could not read Firebase Auth (continuing without it):', error.message);
}

const findings = [];
const flag = (severity, uid, email, what) => findings.push({ severity, uid, email, what });

for (const user of users) {
  if (user.approvalStatus === 'approved') {
    if (!user.approvedBy) {
      flag('HIGH', user.uid, user.email, 'approved with no approvalApprovedBy — the signature of a self-approval');
    } else if (user.approvedBy === user.uid) {
      flag('HIGH', user.uid, user.email, 'approved by themselves');
    } else if (!canApprove(user.approvedBy)) {
      const reviewer = byUid.get(user.approvedBy);
      flag('HIGH', user.uid, user.email,
        `approved by ${user.approvedBy} (${reviewer ? reviewer.email : 'no such user document'}), who does not hold useradmin/superadmin`);
    }
    if (!user.approvedAt) {
      flag('MEDIUM', user.uid, user.email, 'approved with no approvalApprovedAt');
    }
    if (snapshotCounts.get(user.uid) === 0) {
      flag('MEDIUM', user.uid, user.email, 'approved but has no approvedSnapshots document');
    }
  }

  // A privileged profile with no login behind it. Inert today — a fresh signup on
  // that address gets a new uid and a new document, so the roles do not transfer —
  // but it is stale privilege that should not be left lying around, and it means the
  // account did not go through deleteUserAccountCallable, which removes both.
  if (user.roles.length && authRecords.size && !authRecords.has(user.uid)) {
    flag('MEDIUM', user.uid, user.email,
      `holds ${user.roles.join(', ')} but has no Firebase Auth account — orphaned privileged profile`);
  }

  if (user.roles.includes('superadmin')) {
    flag('REVIEW', user.uid, user.email, `holds superadmin — confirm this is intended`);
  } else if (user.roles.length) {
    flag('REVIEW', user.uid, user.email, `holds ${user.roles.join(', ')} — confirm this is intended`);
  }
}

// An attacker could also have added their own address to the admin notice list.
const settings = (await db.doc('settings/notifications').get()).data() ?? {};
const extraEmails = Array.isArray(settings.extraEmails) ? settings.extraEmails : [];
const recipientUserIds = Array.isArray(settings.recipientUserIds) ? settings.recipientUserIds : [];

console.log('='.repeat(78));
console.log('PRIVILEGE AND APPROVAL AUDIT —', new Date().toISOString().slice(0, 19));
console.log('='.repeat(78));
console.log(`user documents      : ${users.length}`);
console.log(`privileged accounts : ${privilegedUids.size}`);
console.log(`approved members    : ${approved.length}`);
console.log(`auth accounts read  : ${authRecords.size || 'unavailable'}`);

console.log('\n--- privileged accounts ---');
for (const user of users.filter(u => u.roles.length).sort((a, b) => a.email.localeCompare(b.email))) {
  const auth = authRecords.get(user.uid);
  console.log(
    `  ${user.email.padEnd(34)} ${user.roles.join('+').padEnd(22)}\n` +
    `      auth: created=${auth?.created ? new Date(auth.created).toISOString().slice(0, 10) : 'NO ACCOUNT'} ` +
    `verified=${auth ? auth.verified : '?'} via=${auth?.providers ?? '?'}\n` +
    `      doc:  created=${user.docCreated} lastWritten=${user.docUpdated}`
  );
}

const orphanProfiles = users.filter(u => authRecords.size && !authRecords.has(u.uid));
const authWithoutProfile = [...authRecords.keys()].filter(uid => !byUid.has(uid));
console.log('\n--- account/profile mismatches ---');
console.log(`  profiles with no auth account : ${orphanProfiles.length}` +
  (orphanProfiles.length ? ` (${orphanProfiles.map(u => u.email).join(', ')})` : ''));
console.log(`  auth accounts with no profile : ${authWithoutProfile.length} (expected: signups that never confirmed)`);

console.log('\n--- notification recipients (settings/notifications) ---');
console.log(`  extraEmails      : ${extraEmails.length ? extraEmails.join(', ') : '(none)'}`);
console.log(`  recipientUserIds : ${
  recipientUserIds.length
    ? recipientUserIds.map(id => byUid.get(id)?.email ?? `${id} (unknown)`).join(', ')
    : '(none)'
}`);

console.log('\n--- findings ---');
const order = { HIGH: 0, MEDIUM: 1, REVIEW: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.email.localeCompare(b.email));
if (!findings.length) {
  console.log('  none');
} else {
  for (const finding of findings) {
    console.log(`  [${finding.severity}] ${finding.email} (${finding.uid})`);
    console.log(`         ${finding.what}`);
  }
}

const high = findings.filter(f => f.severity === 'HIGH').length;
console.log(`\n${high} high-severity finding(s). REVIEW entries are not anomalies — they are`);
console.log('the current privilege roster, which a person has to confirm.');
