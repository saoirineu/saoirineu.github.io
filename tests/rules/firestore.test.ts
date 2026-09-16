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
  deleteField,
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
  CUSTODIAN,
  EVENTADMIN,
  EVENT_ID,
  IMPORTED_MEMBER,
  MANAGER,
  NEWBIE,
  REGISTRATION_ID,
  SUPERADMIN,
  USERADMIN,
  createTestEnvironment,
  donationFixture,
  registrationFixture,
  unverified,
  verified,
  workFixture
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

    // Work records: MANAGER acts for church-1, whose stock is stock-1.
    await setDoc(doc(db, 'users', CUSTODIAN.uid), profile(CUSTODIAN.email, { systemRoles: ['custodian'] }));
    await setDoc(doc(db, 'users', MANAGER.uid), profile(MANAGER.email));
    await setDoc(doc(db, 'churchManagers', MANAGER.uid), { churchIds: ['church-1'], churchNames: ['Stella Azzurra'] });
    await setDoc(doc(db, 'sacramentStocks', 'stock-1'), { name: 'Stella Azzurra', churchIds: ['church-1'] });
    await setDoc(doc(db, 'sacramentStocks', 'stock-2'), { name: 'Barcelona', churchIds: ['church-2'] });
    // A shared depot serving both churches.
    await setDoc(doc(db, 'sacramentStocks', 'stock-shared'), { name: 'Italia', churchIds: ['church-2', 'church-1'] });
    await setDoc(doc(db, 'sacramentItems', 'item-shared'), { stockId: 'stock-shared', degree: '2', form: 'liquid' });
    await setDoc(doc(db, 'sacramentItems', 'item-1'), { stockId: 'stock-1', degree: '2', form: 'liquid' });
    await setDoc(doc(db, 'sacramentItems', 'item-gel'), { stockId: 'stock-1', degree: '1', form: 'gel' });
    await setDoc(doc(db, 'sacramentItems', 'item-2'), { stockId: 'stock-2', degree: '3', form: 'liquid' });
    const stamped = { createdBy: MANAGER.uid, createdAt: new Date(), updatedBy: MANAGER.uid, updatedAt: new Date() };
    await setDoc(doc(db, 'trabalhos', 'work-pre'), { ...workFixture(), ...stamped });
    await setDoc(doc(db, 'trabalhos', 'work-reviewed'), {
      ...workFixture({ reviewStatus: 'reviewed', reviewedBy: ADMIN.uid, reviewedAt: new Date() }),
      ...stamped
    });
    await setDoc(doc(db, 'icefluDonations', 'don-pre'), { ...donationFixture('don-pre'), ...stamped });
    await setDoc(doc(db, 'icefluDonations', 'don-reviewed'), {
      ...donationFixture('don-reviewed', { reviewStatus: 'reviewed', reviewedBy: ADMIN.uid, reviewedAt: new Date() }),
      ...stamped
    });
    await setDoc(doc(db, 'icefluDonations', 'don-other-church'), {
      ...donationFixture('don-other-church', {
        churchId: 'church-2',
        receiptPath: 'churches/church-2/donations/don-other-church/receipt-1.pdf'
      }),
      ...stamped,
      createdBy: ADMIN.uid
    });
    await setDoc(doc(db, 'trabalhos', 'work-other-church'), {
      ...workFixture({ churchId: 'church-2', churchName: 'Barcelona', sacrament: { stockId: 'stock-2', itemId: 'item-2', quantity: 1, unit: 'L' } }),
      ...stamped,
      createdBy: ADMIN.uid
    });
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
  // Counters are maintained by the onRegistrationCapacityChange Cloud Function,
  // which recounts them from the registrations; the client only reads them.
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

describe('guard — work records are church-scoped', () => {
  const created = (who: { uid: string }) => ({
    createdBy: who.uid,
    createdAt: serverTimestamp(),
    updatedBy: who.uid,
    updatedAt: serverTimestamp()
  });
  const edited = (who: { uid: string }) => ({ updatedBy: who.uid, updatedAt: serverTimestamp() });

  it('[guard] a manager can record a pre-approved work for their church', async () => {
    await assertSucceeds(setDoc(doc(as(MANAGER), 'trabalhos', 'new'), { ...workFixture(), ...created(MANAGER) }));
  });

  it('[guard] a gel batch is recorded in kg, never litres', async () => {
    const gel = { stockId: 'stock-1', itemId: 'item-gel', quantity: 0.2 };
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), { ...workFixture({ sacrament: { ...gel, unit: 'L' } }), ...created(MANAGER) })
    );
    await assertSucceeds(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), { ...workFixture({ sacrament: { ...gel, unit: 'kg' } }), ...created(MANAGER) })
    );
  });

  it('[guard] a plain member cannot record a work', async () => {
    await assertFails(setDoc(doc(as(BOB), 'trabalhos', 'new'), { ...workFixture(), ...created(BOB) }));
  });

  it('[guard] a manager cannot record a work for a church they do not manage', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ churchId: 'church-2', sacrament: { stockId: 'stock-2', itemId: 'item-2', quantity: 1, unit: 'L' } }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a stock linked to several churches serves each of them', async () => {
    await assertSucceeds(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ sacrament: { stockId: 'stock-shared', itemId: 'item-shared', quantity: 0.5, unit: 'L' } }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a manager cannot book Daime from another church\'s stock', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ sacrament: { stockId: 'stock-2', itemId: 'item-2', quantity: 1, unit: 'L' } }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a manager cannot pair a batch with a stock it does not belong to', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ sacrament: { stockId: 'stock-1', itemId: 'item-2', quantity: 1, unit: 'L' } }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a manager cannot file a record as already reviewed', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ reviewStatus: 'reviewed', reviewedBy: MANAGER.uid, reviewedAt: serverTimestamp() }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] fardati cannot exceed the total', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'trabalhos', 'new'), {
        ...workFixture({ attendees: { total: 5, initiated: 6 } }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a manager can list their church\'s records, and only those', async () => {
    const db = as(MANAGER);
    await assertSucceeds(getDocs(query(collection(db, 'trabalhos'), where('churchId', '==', 'church-1'))));
    await assertFails(getDocs(query(collection(db, 'trabalhos'), where('churchId', '==', 'church-2'))));
    await assertFails(getDocs(collection(db, 'trabalhos')));
    await assertFails(getDoc(doc(db, 'trabalhos', 'work-other-church')));
  });

  it('[guard] work records are not readable by other members or anonymously', async () => {
    await assertFails(getDoc(doc(as(BOB), 'trabalhos', 'work-pre')));
    await assertFails(getDoc(doc(anon(), 'trabalhos', 'work-pre')));
  });

  it('[guard] an admin can list every record and mark one reviewed', async () => {
    await assertSucceeds(getDocs(collection(as(ADMIN), 'trabalhos')));
    await assertSucceeds(
      updateDoc(doc(as(ADMIN), 'trabalhos', 'work-pre'), {
        reviewStatus: 'reviewed',
        reviewedBy: ADMIN.uid,
        reviewedAt: serverTimestamp(),
        ...edited(ADMIN)
      })
    );
  });

  it('[guard] a manager cannot mark their own record reviewed', async () => {
    await assertFails(
      updateDoc(doc(as(MANAGER), 'trabalhos', 'work-pre'), {
        reviewStatus: 'reviewed',
        reviewedBy: MANAGER.uid,
        reviewedAt: serverTimestamp(),
        ...edited(MANAGER)
      })
    );
  });

  it('[guard] a manager\'s edit sends a reviewed record back to pre-approved', async () => {
    const ref = doc(as(MANAGER), 'trabalhos', 'work-reviewed');
    await assertFails(updateDoc(ref, { hymnalText: 'O Cruzeiro', ...edited(MANAGER) }));
    await assertSucceeds(
      updateDoc(ref, {
        hymnalText: 'O Cruzeiro',
        reviewStatus: 'pre-approved',
        reviewedAt: deleteField(),
        reviewedBy: deleteField(),
        ...edited(MANAGER)
      })
    );
  });

  it('[guard] a manager can correct the Daime of their record within the church\'s stock', async () => {
    const ref = doc(as(MANAGER), 'trabalhos', 'work-pre');
    await assertSucceeds(
      updateDoc(ref, { sacrament: { stockId: 'stock-1', itemId: 'item-1', quantity: 0.8, unit: 'L' }, ...edited(MANAGER) })
    );
    await assertFails(
      updateDoc(ref, { sacrament: { stockId: 'stock-2', itemId: 'item-2', quantity: 0.8, unit: 'L' }, ...edited(MANAGER) })
    );
  });

  it('[guard] unlinking a stock does not lock the records that already used it', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await updateDoc(doc(context.firestore(), 'sacramentStocks', 'stock-1'), { churchIds: deleteField() });
    });
    const ref = doc(as(MANAGER), 'trabalhos', 'work-pre');
    await assertSucceeds(updateDoc(ref, { hymnalText: 'Nova Jerusalém', ...edited(MANAGER) }));
    await assertFails(
      updateDoc(ref, { sacrament: { stockId: 'stock-1', itemId: 'item-1', quantity: 2, unit: 'L' }, ...edited(MANAGER) })
    );
  });

  it('[guard] a manager cannot move a record to another church or reassign its author', async () => {
    await assertFails(updateDoc(doc(as(MANAGER), 'trabalhos', 'work-pre'), { churchId: 'church-2', ...edited(MANAGER) }));
    await assertFails(updateDoc(doc(as(MANAGER), 'trabalhos', 'work-pre'), { createdBy: BOB.uid, ...edited(MANAGER) }));
  });

  it('[guard] a manager can delete a pre-approved record but not a reviewed one', async () => {
    await assertFails(deleteDoc(doc(as(MANAGER), 'trabalhos', 'work-reviewed')));
    await assertSucceeds(deleteDoc(doc(as(MANAGER), 'trabalhos', 'work-pre')));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), 'trabalhos', 'work-reviewed')));
  });

  it('[guard] a manager cannot write the Daime ledger directly', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'sacramentTransactions', 'work-new'), {
        itemId: 'item-1',
        stockId: 'stock-1',
        type: 'entry',
        date: '2026-09-15',
        quantity: 50,
        createdBy: MANAGER.uid
      })
    );
  });

  it('[guard] nobody but an admin can grant church management', async () => {
    const grant = (who: { uid: string }) => ({
      churchIds: ['church-2'],
      churchNames: ['Barcelona'],
      updatedBy: who.uid,
      updatedAt: serverTimestamp()
    });
    await assertFails(setDoc(doc(as(MANAGER), 'churchManagers', MANAGER.uid), grant(MANAGER)));
    await assertFails(setDoc(doc(as(BOB), 'churchManagers', BOB.uid), grant(BOB)));
    await assertFails(setDoc(doc(as(USERADMIN), 'churchManagers', BOB.uid), grant(USERADMIN)));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'churchManagers', BOB.uid), grant(ADMIN)));
  });

  it('[guard] a manager can read their own grant, not someone else\'s', async () => {
    await assertSucceeds(getDoc(doc(as(MANAGER), 'churchManagers', MANAGER.uid)));
    await assertSucceeds(getDoc(doc(as(BOB), 'churchManagers', BOB.uid)));
    await assertFails(getDoc(doc(as(BOB), 'churchManagers', MANAGER.uid)));
  });

  it('[guard] a custodian cannot relink a stock to a church, an admin can', async () => {
    await assertFails(updateDoc(doc(as(CUSTODIAN), 'sacramentStocks', 'stock-2'), { churchIds: ['church-2', 'church-1'] }));
    await assertSucceeds(updateDoc(doc(as(CUSTODIAN), 'sacramentStocks', 'stock-2'), { notes: 'Deposito' }));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'sacramentStocks', 'stock-2'), { churchIds: ['church-2', 'church-1'] }));
  });

  it('[guard] the work-type catalog is readable by members and written by admins only', async () => {
    const items = { items: [{ id: 'concentracao', label: 'Concentração', category: 'official', active: true }] };
    await assertSucceeds(getDoc(doc(as(BOB), 'catalogs', 'workTypes')));
    await assertFails(getDoc(doc(anon(), 'catalogs', 'workTypes')));
    await assertFails(setDoc(doc(as(MANAGER), 'catalogs', 'workTypes'), items));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'catalogs', 'workTypes'), items));
  });
});

describe('guard — ICEFLU donations are church-scoped', () => {
  const created = (who: { uid: string }) => ({
    createdBy: who.uid,
    createdAt: serverTimestamp(),
    updatedBy: who.uid,
    updatedAt: serverTimestamp()
  });
  const edited = (who: { uid: string }) => ({ updatedBy: who.uid, updatedAt: serverTimestamp() });

  it('[guard] a manager can record a pre-approved donation for their church', async () => {
    await assertSucceeds(setDoc(doc(as(MANAGER), 'icefluDonations', 'don-new'), { ...donationFixture('don-new'), ...created(MANAGER) }));
  });

  it('[guard] a plain member cannot record a donation', async () => {
    await assertFails(setDoc(doc(as(BOB), 'icefluDonations', 'don-new'), { ...donationFixture('don-new'), ...created(BOB) }));
  });

  it('[guard] a manager cannot record a donation for another church', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'icefluDonations', 'don-new'), {
        ...donationFixture('don-new', { churchId: 'church-2', receiptPath: 'churches/church-2/donations/don-new/receipt-1.pdf' }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] the receipt must sit in this donation\'s own folder under its church', async () => {
    const attempt = (receiptPath: string) =>
      setDoc(doc(as(MANAGER), 'icefluDonations', 'don-new'), { ...donationFixture('don-new', { receiptPath }), ...created(MANAGER) });
    await assertFails(attempt('churches/church-2/donations/don-new/receipt-1.pdf'));
    await assertFails(attempt('churches/church-1/donations/don-pre/receipt-1-bonifico.pdf'));
    await assertFails(attempt('users/manager/identityDocument-1.pdf'));
    await assertFails(attempt('churches/church-1/donations/don-new/notes.pdf'));
  });

  it('[guard] reason, method and amount are constrained', async () => {
    const attempt = (overrides: Record<string, unknown>) =>
      setDoc(doc(as(MANAGER), 'icefluDonations', 'don-new'), { ...donationFixture('don-new', overrides), ...created(MANAGER) });
    await assertFails(attempt({ reason: 'other' }));
    await assertFails(attempt({ method: 'crypto' }));
    await assertFails(attempt({ amount: 0 }));
    await assertFails(attempt({ recipient: '' }));
    await assertSucceeds(attempt({ reason: 'jurua', method: 'in-person', amount: 12.5 }));
  });

  it('[guard] a manager cannot file a donation as already reviewed', async () => {
    await assertFails(
      setDoc(doc(as(MANAGER), 'icefluDonations', 'don-new'), {
        ...donationFixture('don-new', { reviewStatus: 'reviewed', reviewedBy: MANAGER.uid, reviewedAt: serverTimestamp() }),
        ...created(MANAGER)
      })
    );
  });

  it('[guard] a manager lists only their church\'s donations; others read none', async () => {
    const db = as(MANAGER);
    await assertSucceeds(getDocs(query(collection(db, 'icefluDonations'), where('churchId', '==', 'church-1'))));
    await assertFails(getDocs(query(collection(db, 'icefluDonations'), where('churchId', '==', 'church-2'))));
    await assertFails(getDocs(collection(db, 'icefluDonations')));
    await assertFails(getDoc(doc(as(BOB), 'icefluDonations', 'don-pre')));
    await assertFails(getDoc(doc(anon(), 'icefluDonations', 'don-pre')));
    await assertSucceeds(getDocs(collection(as(ADMIN), 'icefluDonations')));
  });

  it('[guard] only an admin marks a donation reviewed', async () => {
    const review = (who: { uid: string }) => ({
      reviewStatus: 'reviewed',
      reviewedBy: who.uid,
      reviewedAt: serverTimestamp(),
      ...edited(who)
    });
    await assertFails(updateDoc(doc(as(MANAGER), 'icefluDonations', 'don-pre'), review(MANAGER)));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'icefluDonations', 'don-pre'), review(ADMIN)));
  });

  it('[guard] a manager\'s edit sends a reviewed donation back to pre-approved', async () => {
    const ref = doc(as(MANAGER), 'icefluDonations', 'don-reviewed');
    await assertFails(updateDoc(ref, { amount: 400, ...edited(MANAGER) }));
    await assertSucceeds(
      updateDoc(ref, {
        amount: 400,
        reviewStatus: 'pre-approved',
        reviewedAt: deleteField(),
        reviewedBy: deleteField(),
        ...edited(MANAGER)
      })
    );
  });

  it('[guard] a manager can delete a pre-approved donation but not a reviewed one', async () => {
    await assertFails(deleteDoc(doc(as(MANAGER), 'icefluDonations', 'don-reviewed')));
    await assertFails(deleteDoc(doc(as(MANAGER), 'icefluDonations', 'don-other-church')));
    await assertSucceeds(deleteDoc(doc(as(MANAGER), 'icefluDonations', 'don-pre')));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), 'icefluDonations', 'don-reviewed')));
  });
});

describe('guard — outbound mail queue', () => {
  it('[guard] no client reads queued mail, not even a superadmin', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'mailQueue', 'verification-alice'), { kind: 'verification', text: 'link' });
    });
    await assertFails(getDoc(doc(as(SUPERADMIN), 'mailQueue', 'verification-alice')));
    await assertFails(getDoc(doc(as(ALICE), 'mailQueue', 'verification-alice')));
    await assertFails(getDocs(collection(as(ADMIN), 'mailQueue')));
  });

  it('[guard] no client can queue or alter mail', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'mailQueue', 'forged'), { kind: 'user-approved', to: ['x@example.com'] }));
    await assertFails(setDoc(doc(as(SUPERADMIN), 'mailQueue', 'forged'), { kind: 'user-approved', to: ['x@example.com'] }));
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
