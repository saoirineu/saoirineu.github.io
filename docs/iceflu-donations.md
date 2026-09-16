# Donations to ICEFLU Brazil

Status (2026-09-16): **implemented, not yet deployed.** Covers item 3 of the
[2026-09-10 meeting](reunioes/2026-09-10).

Churches record the donations they sent to ICEFLU Brazil, each with proof of payment. It is
the companion of [work records](work-records.md) and shares its access model: the church's
managers record, admins review. Field-level schema lives in
[firestore-schema.md](firestore-schema.md).

## The spec, and how each field maps

> Data, importo, causale (menu a tendina: copertura feitio, associativo, Juruá),
> destinatário, allegare contabile della banca (se bonifico) o ricevuta del destinatario (se
> a mano).

| Spec | Field | Notes |
| --- | --- | --- |
| data | `date` | `YYYY-MM-DD`; the form rejects future dates |
| importo | `amount` | EUR, > 0; accepts "350,50" |
| causale (menu) | `reason` | `feitio` (copertura feitio), `membership` (associativo), `jurua` (Juruá) |
| destinatário | `recipient` | free text |
| bonifico / a mano | `method` | `bank-transfer` or `in-person`; implied by the spec's two kinds of proof |
| contabile / ricevuta | `receiptPath`, `receiptName` | one PDF/JPG/PNG up to 10 MB; the label follows `method` |

Every field is required, including the receipt.

## Decisions

Taken without asking, by following the model already chosen for work records:

1. **Donations belong to a church.** The meeting frames items 2 and 3 as acting "in the name
   of a church" (item 1.1), so the same church managers who record works record donations.
2. **Same review lifecycle.** Saved `pre-approved`; admins mark them reviewed; a manager's
   edit sends a reviewed donation back to pre-approved; managers delete only pre-approved ones.
3. **The reason menu is fixed** to the three reasons in the spec, not an admin-editable list.
4. **The receipt is mandatory**, since the spec asks for it on every donation.

## How it works

### Data

| Where | What |
| --- | --- |
| `icefluDonations/{id}` (Firestore) | the donation record |
| `churches/{churchId}/donations/{donationId}/receipt-*` (Storage) | the proof of payment |

Saving a new donation picks the document id first, uploads the receipt into that donation's
folder, then writes the record. If the write fails the uploaded file is deleted. Replacing a
receipt on edit uploads the new file, saves, then deletes the old one. Deleting a donation
removes the record, then its receipt.

### Permissions

| Action | Church manager | Admin / superadmin | Anyone else |
| --- | --- | --- | --- |
| Read donations and receipts | own churches only | all | no |
| Record a donation, upload a receipt | own churches, always `pre-approved` | any church | no |
| Edit a donation | own churches; goes back to `pre-approved` | any; review status kept | no |
| Mark reviewed / unreviewed | no | yes | no |
| Delete a donation | only while `pre-approved` | always | no |
| Delete a receipt | unless a reviewed donation still points at it | always | no |

Rules also enforce, for any writer:

- the receipt path is inside *this* donation's folder under *its* church, and the file is named
  `receipt-*` (`hasValidDonation` in [firestore.rules](../firestore.rules));
- reason and method come from the fixed lists; the amount is positive; the recipient is not
  blank; church, author and creation time never change;
- a receipt is a PDF, JPG or PNG of at most 10 MB and **cannot be overwritten in place**: in
  Storage an upload over an existing file counts as a create, which would otherwise let a
  manager swap the proof of a reviewed donation ([storage.rules](../storage.rules)).

Covered by [tests/rules/firestore.test.ts](../tests/rules/firestore.test.ts) ("ICEFLU
donations are church-scoped", 10 tests) and
[tests/rules/storage.test.ts](../tests/rules/storage.test.ts) ("donation receipts are
church-scoped", 6 tests).

### User interface

- **`/donations`** ([DonationsPage.tsx](../frontend/src/pages/DonationsPage.tsx),
  [pages/donations/](../frontend/src/pages/donations/)), linked in the nav bar next to Works
  for church managers and admins; anyone else sees who the page is for.
- **Form**: church (preselected for a manager of one church, fixed once saved), date, amount,
  reason, recipient, method (bank transfer / by hand), receipt upload with the existing
  compression and preview. When editing, the current receipt is linked and a new file is only
  needed to replace it.
- **List**: filters by church, year, reason and review status; totals overall and per reason
  for the filtered donations; each donation links its receipt.
- Copy in pt/en/es/it ([copy.ts](../frontend/src/pages/donations/copy.ts)).
- Access and the church list are shared with the works page through
  [useChurchRecordAccess](../frontend/src/providers/useChurchRecordAccess.ts).

## Rolling it out

1. `make firebase-rules` (Firestore and Storage rules), or `make deploy-backend` together with
   the work-records function.
2. Deploy the frontend.
3. Church managers are the same as for works: assign them in *Lavori → Gestori delle chiese*.
   Unlike works, donations need no stock setup.

## Limitations

- **No reconciliation with work records.** The ICEFLU Brazil share entered on each work record
  and the donations recorded here are never compared; there is no "owed vs sent" view.
- **Fixed reasons, no "other".** A donation for any other purpose cannot be recorded until the
  list is extended in code (`DONATION_REASONS`) and in the rules.
- **Recipient is free text**, not a list of ICEFLU bodies or people.
- **One receipt per donation.** No second page, no separate transfer order and receipt.
- **Replaced receipts are deleted.** If a manager replaces the receipt of a reviewed donation,
  the proof the admin reviewed is gone; there is no edit history (same as work records).
- **EUR only**; no currency field, no exchange rate for donations sent in reais.
- **Only donations *to* ICEFLU Brazil**, and only from churches: a donation made by the
  association itself, or received by a church, has nowhere to go.
- **No notifications and no dedicated reviewer**: item 4 (verification by
  `iceflu@santodaime.it`) is still open.
- **Orphaned receipts are possible.** Deleting a file after a failed save or a replacement is
  best effort; a failure leaves an unreferenced file in Storage (harmless, readable only by the
  church's managers and admins).
- **"Not in the future" is a browser check**, like for works.
- **Not covered by tests**: React components and an end-to-end upload against Firebase. The
  UI was checked visually with sample data at desktop and narrow widths.
