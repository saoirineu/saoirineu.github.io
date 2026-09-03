import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type TokenOptions
} from '@firebase/rules-unit-testing';

const repoRoot = resolve(import.meta.dirname, '../..');

export const PROJECT_ID = 'sao-irineu-test';

export function createTestEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(repoRoot, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080
    },
    storage: {
      rules: readFileSync(resolve(repoRoot, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199
    }
  });
}

/**
 * Firebase issues a usable ID token the moment an account is created, before
 * the address is confirmed — so `email_verified` is always stated explicitly
 * here. A test that leaves it implicit is not testing what it thinks it is.
 */
export function verified(email: string): TokenOptions {
  return { email, email_verified: true };
}

export function unverified(email: string): TokenOptions {
  return { email, email_verified: false };
}

// ---- fixture identities -------------------------------------------------

export const ALICE = { uid: 'alice', email: 'alice@example.com' };
export const BOB = { uid: 'bob', email: 'bob@example.com' };
/** A fresh signup: only what the login flow writes, no role or approval field yet. */
export const NEWBIE = { uid: 'newbie', email: 'newbie@example.com' };
export const USERADMIN = { uid: 'uadmin', email: 'uadmin@example.com' };
export const EVENTADMIN = { uid: 'eadmin', email: 'eadmin@example.com' };
export const ADMIN = { uid: 'admin', email: 'admin@example.com' };
export const SUPERADMIN = { uid: 'sadmin', email: 'sadmin@example.com' };

/** The address hardcoded as superadmin in firestore.rules / storage.rules (H3). */
export const BOOTSTRAP_EMAIL = 'renato.fabbri@gmail.com';

/** A member imported from the association spreadsheet who has no portal account (H1). */
export const IMPORTED_MEMBER = { id: 'member-victim', email: 'victim@example.com' };

export const EVENT_ID = 'encontro-test';
export const REGISTRATION_ID = 'reg-alice';

/** A minimal event registration that satisfies hasValidEventRegistrationPayload. */
export function registrationFixture(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'it',
    firstName: 'Alice',
    lastName: 'Example',
    userId: ALICE.uid,
    eventId: EVENT_ID,
    country: 'Italia',
    church: 'Stella Azzurra',
    centerLeader: 'Leader Name',
    centerLeaderEmail: 'leader@example.com',
    isInitiated: true,
    isIcefluMember: true,
    isNovice: false,
    attendanceMode: 'lodging',
    selectedWorks: [],
    needsExtraLinen: false,
    contribution: { nights: 3, lodging: 100, spiritualWorks: 50, extras: 0, total: 150 },
    status: 'pending',
    ...overrides
  };
}
