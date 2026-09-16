# Work records ("lavori fatti")

Status (2026-09-16): **implemented, not yet deployed.** Covers item 2 of the
[2026-09-10 meeting](reunioes/2026-09-10). Item 3 (donations) is documented in [iceflu-donations.md](iceflu-donations.md); the
remaining items are listed under [Not implemented](#not-implemented).

Churches record the spiritual works they have already held: date, work type, participants,
the Daime used, contributions collected and the share owed to ICEFLU Brazil. The Daime used
is taken out of the church's stock in the Sacrament ledger automatically.

Field-level schema lives in [firestore-schema.md](firestore-schema.md); this document covers
behaviour, design decisions, and limits.

## The spec, and how each field maps

> Data, luogo (facoltativo), lavoro (menu a tendina: calendario ufficiale + de cura + São
> Miguel, mesa branca, umbandaime, altro), innario (per scritto, facoltativo), totale
> partecipanti, totale fardati, totale bianchi (calcolato del totale - fardati), daime usato
> (colegato allo loro stock), quantità di daime, totale contributi raccolti, quota per ICEFLU
> Brasile (incluso feitio).

| Spec | Field | Notes |
| --- | --- | --- |
| data | `date` | `YYYY-MM-DD`; the form rejects future dates |
| luogo (facoltativo) | `venueText` | free text, optional |
| lavoro (menu) | `workTypeId`, `workTypeLabel`, `workTypeOther` | menu from `catalogs/workTypes`; "Altro" adds a free-text description |
| innario (per scritto, facoltativo) | `hymnalText` | free text, optional |
| totale partecipanti | `attendees.total` | whole number |
| totale fardati | `attendees.initiated` | whole number, ≤ total |
| totale bianchi (calcolato) | — | shown as total − fardati, **not stored** |
| daime usato (collegato allo stock) | `sacrament.stockId`, `sacrament.itemId` | a batch from a stock linked to the church; required |
| quantità di daime | `sacrament.quantity`, `sacrament.unit` | litres, or kg for gel batches |
| totale contributi raccolti | `contributions.collected` | EUR |
| quota per ICEFLU Brasile (incluso feitio) | `contributions.icefluBrazilQuota` | EUR, entered by hand |

Every field the spec does not mark optional is required in the form.

## Decisions

Taken with the requester on 2026-09-16:

1. **Who records: church managers.** An admin links an account to one or more churches
   (`churchManagers/{uid}`). That account records works for those churches only. This is the
   first step towards item 1.1 (logging in on behalf of a church), not a replacement for it.
2. **Daime comes from the church's own stock and is deducted.** A stock can be linked to a
   church, and one stock can serve several churches (`sacramentStocks.churchIds`). Saving a
   work books an exit movement in the ledger.
3. **The work-type menu is a draft that admins edit.** The official calendar entries were
   drafted, not taken from an ICEFLU source, and are editable in the portal.
4. **No approval gate.** Records are saved `pre-approved` and count straight away. Admins mark
   them `reviewed` ("revisionato e approvato").

## How it works

### Collections

| Collection | Written by | Purpose |
| --- | --- | --- |
| `trabalhos/{id}` | managers of the record's church, admins | the work records |
| `churchManagers/{uid}` | admins | which churches an account acts for |
| `catalogs/workTypes` | admins | the work-type menu |
| `sacramentStocks/{id}.churchIds` | admins | the churches a stock serves |
| `sacramentTransactions/work-{workId}` | the `onWorkSacramentChange` Cloud Function | the Daime exit for a record |

The collection keeps its Portuguese name `trabalhos`, as recorded in
[VOCABULARY.md](../VOCABULARY.md). It previously held a dev-only prototype with a different
shape (title, start time, durations, men/women counts, legacy `beverageBatches`); the
prototype page was replaced.

### Permissions

| Action | Church manager | Admin / superadmin | Anyone else |
| --- | --- | --- | --- |
| Read records | own churches only | all | no (not public) |
| Create a record | own churches, always `pre-approved` | any church | no |
| Edit a record | own churches; the record goes back to `pre-approved` | any; review status kept | no |
| Mark reviewed / unreviewed | no | yes | no |
| Delete a record | only while `pre-approved` | always | no |
| Assign church managers | no | yes | no |
| Edit the work-type menu | no | yes | no |
| Link a stock to churches | no | yes (custodians cannot) | no |
| Write Daime ledger movements | never directly | yes (existing rule) | custodians, as before |

`useradmin` and `eventadmin` get nothing here beyond what other members have. Rules also
enforce, for any writer:

- the record's church, author and creation time cannot change after creation;
- `initiated ≤ total`; numbers are non-negative and bounded;
- the batch belongs to the named stock, that stock is linked to the record's church, and the
  unit matches the batch (`kg` for gel, `L` otherwise). This check runs only when the Daime
  fields change, so unlinking a stock later does not lock existing records;
- a `reviewed` status can only be stamped by the admin giving it.

The rules suite in [tests/rules/firestore.test.ts](../tests/rules/firestore.test.ts)
("work records are church-scoped", 22 tests) encodes all of the above.

### Daime deduction

Managers are not allowed to write to `sacramentTransactions`; that ledger stays
custodian-only. Instead, [`onWorkSacramentChange`](../functions/src/index.ts) runs on every
write to `trabalhos/{workId}` and keeps exactly one movement at
`sacramentTransactions/work-{workId}`:

- record created with Daime → exit movement created;
- Daime quantity, batch, date, work type or church name changed → movement rewritten;
- record deleted → movement deleted;
- other edits (review status, hymnal, contributions…) → nothing written.

The derivation is pure and unit-tested in
[functions/src/workSacrament.ts](../functions/src/workSacrament.ts). The movement carries
`workId`; the Sacrament page labels it "Registro de trabalho" and hides its edit/delete
buttons, since the next save of the record would overwrite any change made there.

### User interface

- **`/works`** ([WorksPage.tsx](../frontend/src/pages/WorksPage.tsx),
  [pages/works/](../frontend/src/pages/works/)), linked in the nav bar for managers and admins.
  Anyone else who opens it sees a message saying who the page is for.
- **Record form**: church (preselected when the account manages one church), date, work type,
  place, hymnal, participants with computed "bianchi", Daime batch with its current balance,
  quantity, contributions. It warns, without blocking, when the quantity exceeds the recorded
  balance.
- **Records list**: filters by church, year and review status; a totals row (works,
  participants, fardati, litres/kg, contributions, ICEFLU share) over the filtered records.
- **Admin tabs**: *Gestori delle chiese* (pick an account, tick churches) and *Tipi di lavoro*
  (rename, regroup, reorder, deactivate, add; "Altro" is built in and always last).
- **Sacrament page**: *Chiese collegate* checklist when creating or editing a stock (admins),
  showing city/country so churches registered under the same name can be told apart.
- UI copy is in pt/en/es/it ([copy.ts](../frontend/src/pages/works/copy.ts)). Work-type names
  are single-language (Portuguese proper names).

## Rolling it out

1. `make deploy-backend` — rules and the Cloud Function together. Deploy the function **before**
   anyone records a work: records saved while it is missing never get a movement (see
   [limitations](#ledger-and-stock)).
2. Deploy the frontend as usual.
3. On the Sacrament page, open *Modifica scorta* on each stock and tick the churches it
   serves (several are allowed), and make sure it holds batches. Tick the same church entry
   used for the managers in step 4: the registry has churches with the same name, told apart
   by the city/country shown next to them. As of 2026-09-16 no stock is linked and the *Italia* stock has no batches, so
   **nobody can save a record until this is done** (the Daime field is required).
4. In *Lavori → Gestori delle chiese*, link the managers' accounts.
5. In *Lavori → Tipi di lavoro*, have ICEFLU Italia correct the draft and press save. Until
   the list is saved the app uses the built-in draft and shows a notice saying so.
6. Optionally delete the two leftover prototype records ("Aniversário do Walter"); only admins
   see them.

## Limitations

### Data and scope

- **The official calendar is unverified.** `DEFAULT_WORK_TYPES` in
  [lib/workTypes.ts](../frontend/src/lib/workTypes.ts) is a first draft (Concentração, Santa
  Missa, Reis, São Sebastião, São José, June feasts, Passagem and Aniversário do Mestre,
  Padrinho Sebastião, Finados, Conceição, Natal, Ano Novo). Dates and entries need review.
- **The ICEFLU Brazil share is a single hand-entered amount.** It is not calculated, the feitio
  part is not broken out, and nothing checks it against the contributions collected or the
  donations actually sent, which are recorded separately ([iceflu-donations.md](iceflu-donations.md)).
- **Money is always EUR**; there is no currency field.
- **Hymnal and place are free text**, not linked to a hymnal catalogue or the church registry.
- **Not collected**: start time, duration, men/women split, first-timers, ICEFLU members vs
  others, children (all discussed in earlier meetings, not in this spec).
- **Records are independent of `events`**: a work held during the European Gathering is not
  linked to the event or its registrations.
- **No export or report page.** Totals exist only on screen; there is no CSV/PDF, and no
  per-church or per-year report beyond the list filters.
- **Every record is loaded at once** (no pagination). Fine at the current volume.

### Ledger and stock

- **Daime is required.** A church with no linked stock cannot record anything, and a work that
  used Daime which is not in the ledger cannot be recorded.
- **Balance is a warning, not a limit.** Rules cannot check stock levels, so a record can
  drive a batch negative.
- **The deduction is eventually consistent and not self-healing.** The movement appears a
  moment after the save, so a balance shown right after saving can be stale. The function has
  no retry and there is no repair script (unlike `scripts/recount-event-capacity.mjs` for
  event capacity). If the function fails, or was not deployed when a record was saved, the
  movement stays missing. Saving the record again without changes does not fix it; changing
  and restoring the quantity does.
- **Admins can still break the link from the Sacrament page.** The UI hides edit/delete on
  work movements, but the rules still let admins change them. Deleting a batch or a stock
  cascades to its movements, including work movements, while the records keep pointing at the
  batch.
- **Stock data is visible to all signed-in members.** Stocks, batches and movements were
  already readable by any verified account; a manager sees every stock, not just their
  church's (the form only offers the church's).

### Review and audit

- **No notifications.** Nobody is emailed when a record is created, edited or reviewed; item 4
  (verification by `iceflu@santodaime.it`) is not implemented.
- **No review comments or "needs changes" state** — only `pre-approved` and `reviewed`.
- **No edit history.** Only the last editor and time are kept. When a manager edits a reviewed
  record, the figures the admin reviewed are lost (unlike member profiles, which keep approved
  snapshots). Admin edits keep the `reviewed` status.
- **Rules trust some denormalised values**: `churchName`, `workTypeLabel` and the batch label
  are copied from the client and not checked against their source. `workTypeId` is not checked
  against the catalogue.
- **"Not in the future" is checked in the browser only**, against the browser's clock; the
  rules only check the date format.

### Managers

- **Managers are personal accounts**, not church logins (item 1.1). They need a verified
  email but not an approved ICEFLU membership.
- **Only admins/superadmins assign managers**, from a plain dropdown of every account (no
  search). Removing a manager does not touch the records they created.
- **At most 30 churches per manager** (rules limit).

### Legacy and side effects

- **The two prototype records cannot be edited** in the new form (they have no church); admins
  can only delete them.
- **The dev-only Churches page** now counts works per church by `churchId`; the "works as
  venue" count was removed, and non-admins see zero works there because records are no longer
  public.
- **The nav bar reads `churchManagers/{uid}`** for every signed-in account to decide whether to
  show the link (a single small document, cached by React Query).

### Testing

- Covered: rules (22 emulator tests), the ledger derivation (7), form helpers and the work-type
  catalogue (21).
- Not covered: React components, the Cloud Function against a real Firestore, and an
  end-to-end run against Firebase. The UI was checked visually at desktop and phone widths with
  sample data only.

## Not implemented

From the [2026-09-10 meeting](reunioes/2026-09-10), still open:

| Item | What | Relation to this work |
| --- | --- | --- |
| 0 | Review of church registrations | none yet |
| 1 | Portal membership for people who are not ICEFLU Italia members | none |
| 1.1 | Logging in on behalf of a church | `churchManagers` is the starting point |
| 4 | Verification of the records by `iceflu@santodaime.it` | `reviewStatus` exists; no notification or dedicated reviewer role |

Item 3 (donations sent to ICEFLU Brazil) is implemented separately: see
[iceflu-donations.md](iceflu-donations.md).

Follow-ups that came out of this work:

- a recount/repair script for work movements, modelled on `scripts/recount-event-capacity.mjs`;
- export of records (CSV) for the association's accounts;
- edit history or reviewed snapshots, if reviewed figures must be preserved.
