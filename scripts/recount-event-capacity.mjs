#!/usr/bin/env node
/**
 * Recomputes events/{eventId}/capacity from the registrations that exist.
 *
 * The onRegistrationCapacityChange Cloud Function does this on every registration
 * write, so counters stay correct on their own. This is for the two cases it does
 * not cover: seeding the counters when that function is first deployed, and
 * repairing them after an event's rooms or totalSlots change (which alters
 * capacity without touching any registration).
 *
 * Usage:
 *   node scripts/recount-event-capacity.mjs            (all events, dry run)
 *   node scripts/recount-event-capacity.mjs --write    (apply)
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { computeCapacityRows, eventCapacityBuckets } from '../functions/lib/eventCapacity.js';

const PROJECT_ID = 'sao-irineu';
const write = process.argv.includes('--write');

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({ credential: credPath ? cert(credPath) : applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const events = await db.collection('events').get();
console.log(`${events.size} event(s)${write ? '' : ' — dry run, pass --write to apply'}\n`);

for (const eventDoc of events.docs) {
  const buckets = eventCapacityBuckets(eventDoc.data());
  const registrations = await db.collection(`events/${eventDoc.id}/registrations`).get();
  const rows = computeCapacityRows(
    buckets,
    registrations.docs.map(doc => ({ capacityBucket: doc.data().capacityBucket, status: doc.data().status }))
  );

  console.log(`${eventDoc.id}  (${registrations.size} registration(s))`);
  for (const row of rows) {
    const existing = await db.doc(`events/${eventDoc.id}/capacity/${row.id}`).get();
    const was = existing.exists ? existing.data() : null;
    const drift = !was || was.reserved !== row.reserved || was.capacity !== row.capacity;
    console.log(
      `  ${row.id.padEnd(20)} capacity=${row.capacity} reserved=${row.reserved} available=${row.available}` +
      (drift ? `   <- was ${was ? `capacity=${was.capacity} reserved=${was.reserved}` : 'absent'}` : '   (unchanged)')
    );
    if (write && drift) {
      await db.doc(`events/${eventDoc.id}/capacity/${row.id}`).set({
        capacity: row.capacity,
        reserved: row.reserved,
        available: row.available,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
  console.log('');
}
console.log(write ? 'Applied.' : 'Nothing written.');
