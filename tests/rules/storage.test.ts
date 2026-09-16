/**
 * Storage security rules — regression suite.
 *
 * Same convention as firestore.test.ts: [C*]/[H*] tests encode the desired end
 * state and fail against the unpatched rules; [guard] tests must keep passing.
 *
 * These files are identity documents, payment proofs and signed consent forms.
 * A read here is a passport scan, not a row.
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, listAll, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import {
  ADMIN,
  ALICE,
  BOB,
  BOOTSTRAP_EMAIL,
  EVENTADMIN,
  EVENT_ID,
  MANAGER,
  REGISTRATION_ID,
  USERADMIN,
  createTestEnvironment,
  donationFixture,
  registrationFixture,
  verified
} from './helpers';
import { doc, setDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
const pdfMeta = { contentType: 'application/pdf' };

const registrationDir = `events/${EVENT_ID}/registrations/${REGISTRATION_ID}`;
const aliceIdDoc = `${registrationDir}/identityDocument-passport.pdf`;
const alicePayment = `${registrationDir}/paymentProof-transfer.pdf`;
const aliceProfileDoc = `users/${ALICE.uid}/identityDocument-carta.pdf`;
const reviewedReceipt = 'churches/church-1/donations/don-reviewed/receipt-1-bonifico.pdf';
const replacedReceipt = 'churches/church-1/donations/don-reviewed/receipt-0-old.pdf';
const pendingReceipt = 'churches/church-1/donations/don-pre/receipt-1-bonifico.pdf';
const otherChurchReceipt = 'churches/church-2/donations/don-other/receipt-1.pdf';

beforeAll(async () => {
  testEnv = await createTestEnvironment();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async context => {
    // Storage rules cross-read Firestore for roles and registration ownership,
    // so the Firestore side has to be seeded too.
    const db = context.firestore();
    const profile = (email: string, extra: Record<string, unknown> = {}) => ({ email, ...extra });
    await setDoc(doc(db, 'users', ALICE.uid), profile(ALICE.email));
    await setDoc(doc(db, 'users', BOB.uid), profile(BOB.email));
    await setDoc(doc(db, 'users', USERADMIN.uid), profile(USERADMIN.email, { systemRoles: ['useradmin'] }));
    await setDoc(doc(db, 'users', EVENTADMIN.uid), profile(EVENTADMIN.email, { systemRoles: ['eventadmin'] }));
    await setDoc(doc(db, 'users', ADMIN.uid), profile(ADMIN.email, { systemRoles: ['admin'] }));
    await setDoc(doc(db, 'events', EVENT_ID), { status: 'published', totalSlots: 100 });
    await setDoc(doc(db, 'events', EVENT_ID, 'registrations', REGISTRATION_ID), {
      ...registrationFixture(),
      submittedAt: new Date()
    });

    // MANAGER acts for church-1 (see firestore.test.ts for the records themselves).
    await setDoc(doc(db, 'users', MANAGER.uid), profile(MANAGER.email));
    await setDoc(doc(db, 'churchManagers', MANAGER.uid), { churchIds: ['church-1'], churchNames: ['Stella Azzurra'] });
    await setDoc(doc(db, 'icefluDonations', 'don-pre'), donationFixture('don-pre'));
    await setDoc(doc(db, 'icefluDonations', 'don-reviewed'), donationFixture('don-reviewed', { reviewStatus: 'reviewed' }));

    const storage = context.storage();
    for (const path of [reviewedReceipt, replacedReceipt, pendingReceipt, otherChurchReceipt]) {
      await uploadBytes(ref(storage, path), PDF, pdfMeta);
    }
    await uploadBytes(ref(storage, aliceIdDoc), PDF, pdfMeta);
    await uploadBytes(ref(storage, alicePayment), PDF, pdfMeta);
    await uploadBytes(ref(storage, aliceProfileDoc), PDF, pdfMeta);
    await uploadBytes(ref(storage, 'docs/privacy-it.pdf'), PDF, pdfMeta);
  });
});

const anon = () => testEnv.unauthenticatedContext().storage();
const as = (who: { uid: string; email: string }) =>
  testEnv.authenticatedContext(who.uid, verified(who.email)).storage();

// ---------------------------------------------------------------------------

describe('C2 — registration documents must not be readable by every account', () => {
  it('[C2] another member cannot download an identity document', async () => {
    await assertFails(getBytes(ref(as(BOB), aliceIdDoc)));
  });

  it('[C2] another member cannot download a payment proof', async () => {
    await assertFails(getBytes(ref(as(BOB), alicePayment)));
  });

  it('[C2] another member cannot enumerate a registration folder', async () => {
    await assertFails(listAll(ref(as(BOB), registrationDir)));
  });

  it('[C2] another member cannot enumerate the whole registrations prefix', async () => {
    await assertFails(listAll(ref(as(BOB), `events/${EVENT_ID}/registrations`)));
  });

  it('[guard] an anonymous caller cannot download an identity document', async () => {
    await assertFails(getBytes(ref(anon(), aliceIdDoc)));
  });

  it('[guard] the owner can still download their own identity document', async () => {
    await assertSucceeds(getBytes(ref(as(ALICE), aliceIdDoc)));
  });

  it('[guard] an eventadmin can still download it for review', async () => {
    await assertSucceeds(getBytes(ref(as(EVENTADMIN), aliceIdDoc)));
  });
});

describe('H2 — nobody may plant files in another member\'s registration folder', () => {
  it('[H2] another member cannot upload into the registration folder', async () => {
    await assertFails(
      uploadBytes(ref(as(BOB), `${registrationDir}/identityDocument-planted.pdf`), PDF, pdfMeta)
    );
  });

  it('[H2] another member cannot plant a payment proof', async () => {
    await assertFails(
      uploadBytes(ref(as(BOB), `${registrationDir}/paymentProof-planted.pdf`), PDF, pdfMeta)
    );
  });

  it('[H2] another member cannot plant a consent form', async () => {
    await assertFails(
      uploadBytes(ref(as(BOB), `${registrationDir}/consentDocument-planted.pdf`), PDF, pdfMeta)
    );
  });

  it('[guard] the owner can still upload to their own pending registration', async () => {
    await assertSucceeds(
      uploadBytes(ref(as(ALICE), `${registrationDir}/identityDocument-second.pdf`), PDF, pdfMeta)
    );
  });

  it('[guard] an unrelated filename is still rejected for the owner', async () => {
    await assertFails(uploadBytes(ref(as(ALICE), `${registrationDir}/payload.pdf`), PDF, pdfMeta));
  });

  it('[guard] a disallowed content type is still rejected', async () => {
    await assertFails(
      uploadBytes(ref(as(ALICE), `${registrationDir}/identityDocument-x.html`), PDF, {
        contentType: 'text/html'
      })
    );
  });

  it('[guard] an oversized upload is still rejected', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1024);
    await assertFails(
      uploadBytes(ref(as(ALICE), `${registrationDir}/identityDocument-big.pdf`), big, pdfMeta)
    );
  });

  it('[guard] another member cannot delete the owner\'s document', async () => {
    await assertFails(deleteObject(ref(as(BOB), aliceIdDoc)));
  });

  it('[guard] the owner can still delete from their own pending registration', async () => {
    await assertSucceeds(deleteObject(ref(as(ALICE), aliceIdDoc)));
  });
});

describe('H3 — no hardcoded email backdoor in storage rules', () => {
  it('[H3] presenting the bootstrap email grants no access to profile documents', async () => {
    const impostor = testEnv.authenticatedContext('impostor', verified(BOOTSTRAP_EMAIL)).storage();
    await assertFails(getBytes(ref(impostor, aliceProfileDoc)));
  });
});

describe('guard — profile documents stay private', () => {
  it('[guard] another member cannot read a profile identity document', async () => {
    await assertFails(getBytes(ref(as(BOB), aliceProfileDoc)));
  });

  it('[guard] an anonymous caller cannot read a profile identity document', async () => {
    await assertFails(getBytes(ref(anon(), aliceProfileDoc)));
  });

  it('[guard] the owner can read their own', async () => {
    await assertSucceeds(getBytes(ref(as(ALICE), aliceProfileDoc)));
  });

  it('[guard] a useradmin can read it for membership review', async () => {
    await assertSucceeds(getBytes(ref(as(USERADMIN), aliceProfileDoc)));
  });

  it('[guard] another member cannot upload into someone else\'s profile folder', async () => {
    await assertFails(
      uploadBytes(ref(as(BOB), `users/${ALICE.uid}/identityDocument-planted.pdf`), PDF, pdfMeta)
    );
  });
});

describe('guard — donation receipts are church-scoped', () => {
  it('[guard] a manager can upload a receipt into their church\'s donation folder', async () => {
    await assertSucceeds(uploadBytes(ref(as(MANAGER), 'churches/church-1/donations/don-new/receipt-2-ricevuta.pdf'), PDF, pdfMeta));
  });

  it('[guard] receipts must be PDF/JPG/PNG files named receipt-*', async () => {
    await assertFails(uploadBytes(ref(as(MANAGER), 'churches/church-1/donations/don-new/receipt-2.txt'), PDF, { contentType: 'text/plain' }));
    await assertFails(uploadBytes(ref(as(MANAGER), 'churches/church-1/donations/don-new/invoice-2.pdf'), PDF, pdfMeta));
  });

  it('[guard] a plain member cannot upload or read receipts', async () => {
    await assertFails(uploadBytes(ref(as(BOB), 'churches/church-1/donations/don-new/receipt-2.pdf'), PDF, pdfMeta));
    await assertFails(getBytes(ref(as(BOB), pendingReceipt)));
    await assertFails(getBytes(ref(anon(), pendingReceipt)));
  });

  it('[guard] a manager reads their church\'s receipts only; an admin reads all', async () => {
    await assertSucceeds(getBytes(ref(as(MANAGER), pendingReceipt)));
    await assertFails(getBytes(ref(as(MANAGER), otherChurchReceipt)));
    await assertFails(uploadBytes(ref(as(MANAGER), 'churches/church-2/donations/don-x/receipt-1.pdf'), PDF, pdfMeta));
    await assertSucceeds(getBytes(ref(as(ADMIN), otherChurchReceipt)));
  });

  it('[guard] a manager cannot delete the receipt a reviewed donation keeps as proof', async () => {
    await assertFails(deleteObject(ref(as(MANAGER), reviewedReceipt)));
    await assertSucceeds(deleteObject(ref(as(MANAGER), replacedReceipt)));
    await assertSucceeds(deleteObject(ref(as(MANAGER), pendingReceipt)));
    await assertSucceeds(deleteObject(ref(as(ADMIN), reviewedReceipt)));
  });

  it('[guard] receipts cannot be overwritten in place', async () => {
    await assertFails(uploadBytes(ref(as(MANAGER), pendingReceipt), PDF, pdfMeta));
  });
});

describe('guard — public association documents', () => {
  it('[guard] the privacy notice stays publicly readable', async () => {
    await assertSucceeds(getBytes(ref(anon(), 'docs/privacy-it.pdf')));
  });

  it('[guard] no client can write into docs/', async () => {
    await assertFails(uploadBytes(ref(as(ADMIN), 'docs/forged.pdf'), PDF, pdfMeta));
  });
});

describe('guard — default deny', () => {
  it('[guard] an unmatched path is denied to signed-in members', async () => {
    await assertFails(uploadBytes(ref(as(ALICE), 'random/file.pdf'), PDF, pdfMeta));
  });

  it('[guard] an unmatched path is denied to anonymous callers', async () => {
    await assertFails(getBytes(ref(anon(), 'random/file.pdf')));
  });
});
