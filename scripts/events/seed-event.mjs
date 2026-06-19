#!/usr/bin/env node
/**
 * Seed the generic `events/encontro-europeu-2026` document from the current
 * European Gathering constants (Part 2, Phase 4d). The doc id is the slug.
 *
 * Seeded as `published` (Phase 4e.3 cutover): /european-gathering now redirects here and
 * the dashboard lists it for approved members. Run with --live to create/publish it.
 * Re-running is idempotent (createdAt only on first write).
 *
 * Flags:
 *   --dry-run   Print what would happen without writing (default)
 *   --live      Actually write to Firestore
 *
 * Usage:
 *   node scripts/events/seed-event.mjs            # dry run
 *   node scripts/events/seed-event.mjs --live
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS or run
 *   gcloud auth application-default login
 */

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'sao-irineu';
const COLLECTION = 'events';
const SLUG = 'encontro-europeu-2026';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--live');

const event = {
  title: {
    pt: 'Encontro Europeu 2026',
    en: 'European Gathering 2026',
    es: 'Encuentro Europeo 2026',
    it: 'Incontro Europeo 2026'
  },
  slug: SLUG,
  status: 'published',
  kind: 'multi',
  capacityMode: 'total',
  totalSlots: 84,
  cautionDepositRate: 0.3,
  payment: {
    beneficiary: 'STELLA AZZURRA ETS',
    iban: 'IT43W0306909606100000133653',
    swift: 'BCITITMM',
    causale: 'Encontro Europeu 2026'
  },
  works: [
    {
      id: 'fri-25-19',
      dateTime: '2026-09-25T19:00',
      label: {
        pt: 'Sexta-feira, 25 de setembro, 19:00',
        en: 'Friday, September 25, 19:00',
        es: 'Viernes 25 de septiembre, 19:00',
        it: 'Venerdì 25 settembre, ore 19:00'
      }
    },
    {
      id: 'sat-26-19',
      dateTime: '2026-09-26T19:00',
      label: {
        pt: 'Sábado, 26 de setembro, 19:00',
        en: 'Saturday, September 26, 19:00',
        es: 'Sábado 26 de septiembre, 19:00',
        it: 'Sabato 26 settembre, ore 19:00'
      }
    },
    {
      id: 'mon-28-19',
      dateTime: '2026-09-28T19:00',
      label: {
        pt: 'Segunda-feira, 28 de setembro, 19:00',
        en: 'Monday, September 28, 19:00',
        es: 'Lunes 28 de septiembre, 19:00',
        it: 'Lunedì 28 settembre, ore 19:00'
      }
    },
    {
      id: 'wed-30-19',
      dateTime: '2026-09-30T19:00',
      label: {
        pt: 'Quarta-feira, 30 de setembro, 19:00',
        en: 'Wednesday, September 30, 19:00',
        es: 'Miércoles 30 de septiembre, 19:00',
        it: 'Mercoledì 30 settembre, ore 19:00'
      }
    }
  ],
  pricing: {
    lodgingNightRate: 70,
    mealsNightRate: 30,
    extraLinen: 20,
    worksByCount: {
      anyone: [0, 100, 180, 240, 300],
      initiated: [0, 80, 150, 210, 260],
      iceflu: [0, 60, 110, 150, 190]
    }
  },
  resources: {
    programUrl: {
      pt: '/encontro-europeu/programa-geral-pt.pdf',
      en: '/encontro-europeu/programa-geral-en.pdf',
      es: '/encontro-europeu/programa-geral-es.pdf',
      it: '/encontro-europeu/programa-geral-it.pdf'
    },
    directionsUrl: {
      pt: '/encontro-europeu/como-chegar-pt.pdf',
      en: '/encontro-europeu/como-chegar-en.pdf',
      es: '/encontro-europeu/como-chegar-es.pdf',
      it: '/encontro-europeu/como-chegar-it.pdf'
    },
    consentFormUrl: {
      pt: '/encontro-europeu/consenso-informado-pt.pdf',
      en: '/encontro-europeu/consenso-informado-en.pdf',
      es: '/encontro-europeu/consenso-informado-es.pdf',
      it: '/encontro-europeu/consenso-informado-it.pdf'
    }
  },
  checkInSuggested: '2026-09-24',
  checkOutSuggested: '2026-10-01'
};

function initFirebase() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  initializeApp({
    credential: credPath ? cert(credPath) : applicationDefault(),
    projectId: PROJECT_ID
  });
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes will be made. Pass --live to apply.\n' : 'LIVE MODE — writing to Firestore.\n');
  console.log(`Target: ${COLLECTION}/${SLUG} (status: ${event.status})`);
  console.log(`Works: ${event.works.length} · capacity: ${event.totalSlots} slots · deposit: ${event.cautionDepositRate * 100}%`);

  if (DRY_RUN) {
    console.log('\nRun with --live to apply.');
    return;
  }

  initFirebase();
  const db = getFirestore();
  const ref = db.collection(COLLECTION).doc(SLUG);
  const snap = await ref.get();

  await ref.set(
    {
      ...event,
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  console.log(`\n${snap.exists ? 'Updated' : 'Created'} ${COLLECTION}/${SLUG}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
