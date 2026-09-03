/**
 * Firestore security rules — regression suite.
 *
 * Test names are tagged with the finding ids from docs/security/README.md.
 * Tests tagged [C*]/[H*]/[M*] encode the DESIRED end state, so they FAIL against
 * the unpatched rules on purpose — they are the acceptance criteria for each fix.
 * Tests tagged [guard] already pass and must keep passing.
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ADMIN,
  ALICE,
  BOB,
  BOOTSTRAP_EMAIL,
  EVENTADMIN,
  EVENT_ID,
  IMPORTED_MEMBER,
  NEWBIE,
  REGISTRATION_ID,
  SUPERADMIN,
  USERADMIN,
  createTestEnvironment,
  registrationFixture,
  unverified,
  verified
} from './helpers';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await createTestEnvironment();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();

    const profile = (email: string, extra: Record<string, unknown> = {}) => ({
      email,
      fullName: 'Fixture Person',
      fiscalCode: 'RSSMRA85M01H501Q',
      birthDate: '1985-08-01',
      address: 'Via Roma 1',
      postalCode: '00100',
      phone: '+39 000 0000000',
      isInitiated: true,
      initiationChurchName: 'Céu do Mar',
      approvalStatus: 'approved',
      ...extra
    });

    // Alice already carries the fields, so guards written with changedKeys() do catch her.
    await setDoc(doc(db, 'users', ALICE.uid), profile(ALICE.email, { systemRole: 'user', approvalStatus: 'pending' }));
    // A fresh signup carries none of them — this is the state the guards miss.
    await setDoc(doc(db, 'users', NEWBIE.uid), { email: NEWBIE.email });
    await setDoc(doc(db, 'users', BOB.uid), profile(BOB.email));
    await setDoc(doc(db, 'users', USERADMIN.uid), profile(USERADMIN.email, { systemRoles: ['useradmin'] }));
    await setDoc(doc(db, 'users', EVENTADMIN.uid), profile(EVENTADMIN.email, { systemRoles: ['eventadmin'] }));
    await setDoc(doc(db, 'users', ADMIN.uid), profile(ADMIN.email, { systemRoles: ['admin'] }));
    await setDoc(doc(db, 'users', SUPERADMIN.uid), profile(SUPERADMIN.email, { systemRoles: ['superadmin'] }));

    // Imported from the association spreadsheet; nobody has signed up as them.
    await setDoc(doc(db, 'members', IMPORTED_MEMBER.id), {
      email: IMPORTED_MEMBER.email,
      fullName: 'Victim Example',
      fiscalCode: 'VCTMXM80A01H501Z',
      address: 'Via Privata 9'
    });
    await setDoc(doc(db, 'members', 'member-alice'), { email: ALICE.email, fullName: 'Alice Example' });

    await setDoc(doc(db, 'churches', 'church-1'), { name: 'Stella Azzurra' });
    await setDoc(doc(db, 'beverageBatches', 'batch-1'), { name: 'Feitio 2026', litres: 40 });
    await setDoc(doc(db, 'pessoas', 'pessoa-1'), { name: 'Fixture' });

    await setDoc(doc(db, 'events', EVENT_ID), { status: 'published', totalSlots: 100, slug: EVENT_ID });
    await setDoc(doc(db, 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
      ...registrationFixture(),
      submittedAt: new Date()
    });
    await setDoc(doc(db, 'events', EVENT_ID, 'capacity', 'total'), {
      capacity: 100,
      reserved: 10,
      available: 90,
      updatedAt: new Date()
    });

    await setDoc(doc(db, 'settings', 'notifications'), { extraEmails: [] });
  });
});

const anon = () => testEnv.unauthenticatedContext().firestore();
const as = (who: { uid: string; email: string }) =>
  testEnv.authenticatedContext(who.uid, verified(who.email)).firestore();

// ---------------------------------------------------------------------------

describe('C1 — users must not be world-readable', () => {
  it('[C1] an unauthenticated reader cannot get a user profile', async () => {
    await assertFails(getDoc(doc(anon(), 'users', ALICE.uid)));
  });

  it('[C1] an unauthenticated reader cannot list the users collection', async () => {
    await assertFails(getDocs(collection(anon(), 'users')));
  });

  it('[C1] a signed-in member cannot read another member profile', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'users', BOB.uid)));
  });

  it('[C1] a signed-in member cannot list the users collection', async () => {
    await assertFails(getDocs(collection(as(ALICE), 'users')));
  });

  it('[guard] a member can still read their own profile', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'users', ALICE.uid)));
  });

  it('[guard] a useradmin can still list users for the review queue', async () => {
    await assertSucceeds(getDocs(collection(as(USERADMIN), 'users')));
  });

  it('[guard] an admin can still read an arbitrary profile', async () => {
    await assertSucceeds(getDoc(doc(as(ADMIN), 'users', ALICE.uid)));
  });
});

describe('H1 — an unverified address must not unlock anything', () => {
  const unverifiedAs = (uid: string, email: string) =>
    testEnv.authenticatedContext(uid, unverified(email)).firestore();

  it('[H1] an unverified signup on a stranger\'s address cannot read their member record', async () => {
    const attacker = unverifiedAs('attacker', IMPORTED_MEMBER.email);
    await assertFails(getDoc(doc(attacker, 'members', IMPORTED_MEMBER.id)));
  });

  it('[H1] an unverified signup cannot query members by that address', async () => {
    const attacker = unverifiedAs('attacker', IMPORTED_MEMBER.email);
    await assertFails(
      getDocs(query(collection(attacker, 'members'), where('email', '==', IMPORTED_MEMBER.email)))
    );
  });

  it('[H1] an unverified account cannot write its own profile', async () => {
    const attacker = unverifiedAs(ALICE.uid, ALICE.email);
    await assertFails(updateDoc(doc(attacker, 'users', ALICE.uid), { city: 'Roma' }));
  });

  it('[guard] a verified member can still read their own member record', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'members', 'member-alice')));
  });

  it('[guard] a verified member cannot read someone else\'s member record', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'members', IMPORTED_MEMBER.id)));
  });

  it('[guard] members stay unreadable to anonymous callers', async () => {
    await assertFails(getDoc(doc(anon(), 'members', IMPORTED_MEMBER.id)));
  });
});

describe('H3 — no hardcoded email backdoor', () => {
  it('[H3] presenting the bootstrap email without a stored role grants no admin read', async () => {
    const impostor = testEnv.authenticatedContext('impostor', verified(BOOTSTRAP_EMAIL)).firestore();
    await assertFails(getDoc(doc(impostor, 'members', IMPORTED_MEMBER.id)));
  });

  it('[H3] presenting the bootstrap email grants no admin write', async () => {
    const impostor = testEnv.authenticatedContext('impostor', verified(BOOTSTRAP_EMAIL)).firestore();
    await assertFails(setDoc(doc(impostor, 'members', 'planted'), { email: 'x@example.com' }));
  });

  it('[guard] a stored superadmin role still grants admin access', async () => {
    await assertSucceeds(getDoc(doc(as(SUPERADMIN), 'members', IMPORTED_MEMBER.id)));
  });
});

describe('M1 — reference collections must not be writable by any signed-in account', () => {
  it('[M1] a plain member cannot delete a church', async () => {
    await assertFails(deleteDoc(doc(as(ALICE), 'churches', 'church-1')));
  });

  it('[M1] a plain member cannot overwrite a church', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'churches', 'church-1'), { name: 'defaced' }));
  });

  it('[M1] a plain member cannot delete a sacrament beverage batch', async () => {
    await assertFails(deleteDoc(doc(as(ALICE), 'beverageBatches', 'batch-1')));
  });

  it('[M1] a plain member cannot write a sacrament beverage batch', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'beverageBatches', 'batch-2'), { name: 'forged' }));
  });

  it('[M1] pessoas is not world-readable', async () => {
    await assertFails(getDoc(doc(anon(), 'pessoas', 'pessoa-1')));
  });

  it('[M1] a plain member cannot write pessoas', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'pessoas', 'pessoa-2'), { name: 'forged' }));
  });

  it('[guard] a member can still add a church missing from the registry', async () => {
    await assertSucceeds(
      setDoc(doc(as(ALICE), 'churches', 'church-new'), { name: 'Céu do Norte' })
    );
  });

  it('[guard] an admin can still maintain the church registry', async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), 'churches', 'church-1'), { name: 'Stella Azzurra' }));
  });
});

describe('M2 — event capacity counters are not client-writable', () => {
  it('[M2] a plain member cannot reserve the whole event (registration DoS)', async () => {
    await assertFails(
      setDoc(doc(as(ALICE), 'events', EVENT_ID, 'capacity', 'total'), {
        capacity: 100,
        reserved: 100,
        available: 0,
        updatedAt: serverTimestamp()
      })
    );
  });

  it('[M2] a plain member cannot zero the reservation count (overbooking)', async () => {
    await assertFails(
      setDoc(doc(as(ALICE), 'events', EVENT_ID, 'capacity', 'total'), {
        capacity: 100,
        reserved: 0,
        available: 100,
        updatedAt: serverTimestamp()
      })
    );
  });

  it('[guard] an eventadmin can still adjust capacity', async () => {
    await assertSucceeds(
      setDoc(doc(as(EVENTADMIN), 'events', EVENT_ID, 'capacity', 'total'), {
        capacity: 100,
        reserved: 11,
        available: 89,
        updatedAt: serverTimestamp()
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Behaviour that is already correct. These are the tests that must not regress
// while the fixes above are being applied.
// ---------------------------------------------------------------------------

describe('C3 — field-addition bypass of the role and approval guards', () => {
  // firestore.rules guards these with diff().changedKeys(), which by definition
  // reports only keys present in BOTH the old and the new document. A key that is
  // merely ADDED lands in addedKeys() instead, so every guard below is bypassed
  // whenever the field is simply absent — the default state of a fresh signup.
  //
  // The fix is affectedKeys(), which hasValidEventRegistrationOwnerUpdate() a few
  // lines up in the same rules file already uses correctly.

  const newbie = () => testEnv.authenticatedContext(NEWBIE.uid, verified(NEWBIE.email)).firestore();

  it('[C3] a fresh signup cannot add systemRole to their own profile', async () => {
    await assertFails(updateDoc(doc(newbie(), 'users', NEWBIE.uid), { systemRole: 'superadmin' }));
  });

  it('[C3] a fresh signup cannot add systemRoles to their own profile', async () => {
    await assertFails(updateDoc(doc(newbie(), 'users', NEWBIE.uid), { systemRoles: ['superadmin'] }));
  });

  it('[C3] a fresh signup cannot self-approve by adding approvalStatus', async () => {
    await assertFails(updateDoc(doc(newbie(), 'users', NEWBIE.uid), { approvalStatus: 'approved' }));
  });

  it('[C3] a fresh signup cannot add the approval audit fields', async () => {
    await assertFails(
      updateDoc(doc(newbie(), 'users', NEWBIE.uid), {
        approvalApprovedAt: serverTimestamp(),
        approvalApprovedBy: USERADMIN.uid
      })
    );
  });

  it('[C3] a useradmin cannot add systemRoles to another account', async () => {
    await assertFails(updateDoc(doc(as(USERADMIN), 'users', NEWBIE.uid), { systemRoles: ['superadmin'] }));
  });

  it('[C3] a useradmin cannot inject an absent field under cover of approval', async () => {
    await assertFails(
      updateDoc(doc(as(USERADMIN), 'users', NEWBIE.uid), {
        approvalStatus: 'approved',
        fiscalCode: 'INJECTED00000000',
        updatedAt: serverTimestamp()
      })
    );
  });

  it('[C3] end-to-end: self-escalation must not unlock the members registry', async () => {
    const db = newbie();
    await assertFails(getDoc(doc(db, 'members', IMPORTED_MEMBER.id)));
    // If this write is permitted, the reader below inherits full superadmin.
    await assertFails(updateDoc(doc(db, 'users', NEWBIE.uid), { systemRoles: ['superadmin'] }));
    const after = testEnv.authenticatedContext(NEWBIE.uid, verified(NEWBIE.email)).firestore();
    await assertFails(getDoc(doc(after, 'members', IMPORTED_MEMBER.id)));
    await assertFails(getDoc(doc(after, 'settings', 'notifications')));
  });

  it('[guard] changing an EXISTING systemRole is already blocked', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'users', ALICE.uid), { systemRole: 'superadmin' }));
  });

  it('[guard] changing an EXISTING approvalStatus to approved is already blocked', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'users', ALICE.uid), { approvalStatus: 'approved' }));
  });
});

describe('guard — user document write scope', () => {
  it('[guard] a member can still submit themselves for review', async () => {
    await assertSucceeds(updateDoc(doc(as(ALICE), 'users', ALICE.uid), { approvalStatus: 'pending' }));
  });

  it('[guard] a useradmin can approve, but only the approval fields', async () => {
    await assertSucceeds(
      updateDoc(doc(as(USERADMIN), 'users', ALICE.uid), {
        approvalStatus: 'approved',
        approvalApprovedAt: serverTimestamp(),
        approvalApprovedBy: USERADMIN.uid,
        updatedAt: serverTimestamp()
      })
    );
  });

  it('[guard] a useradmin cannot rewrite personal data that is already present', async () => {
    await assertFails(
      updateDoc(doc(as(USERADMIN), 'users', ALICE.uid), {
        approvalStatus: 'approved',
        fiscalCode: 'TAMPERED0000000X',
        updatedAt: serverTimestamp()
      })
    );
  });

  it('[guard] nobody can delete a user document from the client', async () => {
    await assertFails(deleteDoc(doc(as(SUPERADMIN), 'users', BOB.uid)));
  });
});

describe('guard — event registrations stay owner-scoped', () => {
  it('[guard] the owner can read their registration', async () => {
    await assertSucceeds(
      getDoc(doc(as(ALICE), 'events', EVENT_ID, 'registrations', REGISTRATION_ID))
    );
  });

  it('[guard] another member cannot read it', async () => {
    await assertFails(getDoc(doc(as(BOB), 'events', EVENT_ID, 'registrations', REGISTRATION_ID)));
  });

  it('[guard] an anonymous caller cannot read it', async () => {
    await assertFails(getDoc(doc(anon(), 'events', EVENT_ID, 'registrations', REGISTRATION_ID)));
  });

  it('[guard] an eventadmin can read it', async () => {
    await assertSucceeds(
      getDoc(doc(as(EVENTADMIN), 'events', EVENT_ID, 'registrations', REGISTRATION_ID))
    );
  });

  it('[guard] a member cannot file a registration in someone else\'s name', async () => {
    await assertFails(
      setDoc(doc(as(BOB), 'events', EVENT_ID, 'registrations', 'reg-forged'), {
        ...registrationFixture({ userId: ALICE.uid }),
        submittedAt: serverTimestamp()
      })
    );
  });

  it('[guard] a member cannot self-approve their registration', async () => {
    await assertFails(
      updateDoc(doc(as(ALICE), 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
        status: 'approved'
      })
    );
  });

  it('[guard] a member cannot forge the reference-church decision', async () => {
    await assertFails(
      updateDoc(doc(as(ALICE), 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
        leaderApproval: 'approved'
      })
    );
  });

  it('[guard] a member cannot forge the payment decision', async () => {
    await assertFails(
      updateDoc(doc(as(ALICE), 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
        paymentApproval: 'approved'
      })
    );
  });

  it('[guard] the owner can still correct their own pending registration', async () => {
    await assertSucceeds(
      updateDoc(doc(as(ALICE), 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
        ...registrationFixture({ church: 'Céu do Mar' })
      })
    );
  });
});

describe('guard — consents and settings', () => {
  it('[guard] a member cannot read another member\'s consent ledger', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', ALICE.uid, 'consents', 'c1'), {
        status: 'pending',
        documentName: 'consent.pdf',
        documentPath: `users/${ALICE.uid}/consentDocument-1.pdf`,
        uploadedAt: new Date()
      });
    });
    await assertFails(getDoc(doc(as(BOB), 'users', ALICE.uid, 'consents', 'c1')));
  });

  it('[guard] a member cannot self-approve their own consent', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', ALICE.uid, 'consents', 'c1'), {
        status: 'pending',
        documentName: 'consent.pdf',
        documentPath: `users/${ALICE.uid}/consentDocument-1.pdf`,
        uploadedAt: new Date()
      });
    });
    await assertFails(
      updateDoc(doc(as(ALICE), 'users', ALICE.uid, 'consents', 'c1'), { status: 'approved' })
    );
  });

  it('[guard] a plain member cannot read notification settings', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'settings', 'notifications')));
  });

  it('[guard] settings stay unreadable to anonymous callers', async () => {
    await assertFails(getDoc(doc(anon(), 'settings', 'notifications')));
  });

  it('[guard] a member cannot forge an approved snapshot', async () => {
    await assertFails(
      setDoc(doc(as(ALICE), 'users', ALICE.uid, 'approvedSnapshots', 'snap-1'), { fullName: 'Alice' })
    );
  });
});

describe('guard — default deny', () => {
  it('[guard] an unmatched collection is denied to anonymous callers', async () => {
    await assertFails(getDoc(doc(anon(), 'somethingNew', 'x')));
  });

  it('[guard] an unmatched collection is denied to signed-in members', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'somethingNew', 'x'), { a: 1 }));
  });

  it('[guard] an unmatched collection is denied even to a superadmin', async () => {
    await assertFails(setDoc(doc(as(SUPERADMIN), 'somethingNew', 'x'), { a: 1 }));
  });
});
