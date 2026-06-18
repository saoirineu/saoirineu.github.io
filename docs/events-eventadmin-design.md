# Design — Generic Events, `eventadmin`, Consent Aging & Richer Leader Decisions

Status: **proposal / design doc** (no code yet). Covers Part 2 items A, B, C from the
2026‑06 request. Part 1 (European Gathering page tweaks) is already implemented.

Decisions locked with the requester:
- **Config‑driven events** — generalize the bespoke European Gathering into an `events`
  collection; Encontro Europeu becomes the first instance.
- **New `eventadmin` SystemRole** — a distinct credential that can create/manage events.
- **A1 (consent storage):** dedicated `users/{uid}/consents` ledger (not reusing
  `approvedSnapshots`) — keeps consent validity independent of membership approval.
- **B1 (interview outcomes):** the two "interview" decisions are **not terminal** — they open
  a follow‑up *thread* that the eventadmin tracks while waiting for the reference church to
  signal final approval/rejection after the interview. See §4.
- **C1 (migration):** **strangler** — build the generic engine alongside the live EG page and
  migrate EG last. (Big‑bang = one rewrite+cutover, cleaner but risky since EG is in use;
  strangler = incremental, always shippable, easy rollback.)
- Build order: this doc first, then implement.

---

## 0. Current state (what we build on)

- **Membership/approval** lives on `users/{uid}`: `approvalStatus`
  (`needs-profile | pending | approved | needs-info`), `approvalApprovedAt/By`, plus a
  `users/{uid}/approvedSnapshots/{id}` subcollection of dated approval snapshots
  (`approvedAt`, `approvedBy`, copy of profile + `identityDocumentPrimaryPath`).
  See [users.ts](../frontend/src/lib/users.ts).
- **European Gathering** is bespoke: one fixed form
  ([EuropeanGatheringPage.tsx](../frontend/src/pages/EuropeanGatheringPage.tsx)),
  registrations in `europeanGatheringRegistrations`, capacity in `europeanGatheringRooms`,
  config hardcoded in [european-gathering/form.ts](../frontend/src/pages/european-gathering/form.ts)
  and [europeanGathering.ts](../frontend/src/lib/europeanGathering.ts).
- **Leader review** is a tokenized callable flow — `europeanGatheringLeaderView` /
  `europeanGatheringLeaderRespond` ([functions/src/index.ts](../functions/src/index.ts)) +
  [LeaderReviewPage.tsx](../frontend/src/pages/LeaderReviewPage.tsx). Decision is binary
  `approved | rejected`.
- **Roles** are hardcoded in 5 places in [firestore.rules](../firestore.rules) and in
  [systemRole.ts](../frontend/src/lib/systemRole.ts).
- `/works` is a dev‑only CRUD over `trabalhos` ([WorksPage.tsx](../frontend/src/pages/WorksPage.tsx)),
  unrelated to events today.

---

## 1. `eventadmin` SystemRole

A new privileged role, parallel to `useradmin`/`custodian`/`admin`.

**Frontend** ([systemRole.ts](../frontend/src/lib/systemRole.ts)):
- Add `'eventadmin'` to `SystemRole`, `privilegedSystemRoleOptions`, `normalizeSystemRole`,
  `primarySystemRole` (rank it below `admin`, above `user`), and `hasRequiredRole`
  (`requiredRole === 'eventadmin'` → `roles.includes('eventadmin')`; superadmin always true).
- Update `systemRole.test.ts`.

**Rules** ([firestore.rules](../firestore.rules)):
- Add `isEventAdmin()` → `isAdmin() || hasStoredRole('eventadmin')`.
- Add `'eventadmin'` to the allow‑lists in `hasValidUserSystemRole` (l.62),
  `hasValidUserSystemRoles` (l.70, bump `size()` cap to 6).

**UI**: [AdminUsersPage.tsx](../frontend/src/pages/AdminUsersPage.tsx) role assignment,
[RoleGate.tsx](../frontend/src/components/RoleGate.tsx) (already generic), and a route guard
for the events admin page in [App.tsx](../frontend/src/App.tsx).

Who can do what: **eventadmin** creates/edits/publishes events and sees event registrations.
**admin/superadmin** inherit eventadmin (via `isAdmin()` short‑circuit). Membership approval
stays with `useradmin`/`admin` (unchanged).

---

## 2. Item C — config‑driven `events`

### 2.1 `events/{eventId}` document

```
events/{eventId}
  title:            { pt, en, es, it }            # localized
  slug:             string                          # e.g. "encontro-europeu-2026"
  status:           'draft' | 'published' | 'closed' | 'archived'
  kind:             'single' | 'multi'             # single work vs multi-day
  createdBy:        uid
  createdAt, updatedAt

  # capacity (C: "participation slots and/or rooms with sleeping slots")
  capacityMode:     'total' | 'rooms'
  totalSlots:       number                          # when capacityMode == 'total'
  rooms:            [{ name, capacity }]            # when capacityMode == 'rooms'

  # payment (Part 1 items 5/6 generalized)
  cautionDepositRate: number                        # 0..1, default 0.30
  payment:          { beneficiary, iban, swift, causale }

  # works/sessions (item 4 generalized): one row for 'single', many for 'multi'
  works:            [{ id, label{pt,en,es,it}, dateTime }]
  pricing:          { lodgingNightRate, mealsNightRate, extraLinen,
                      worksByCount: { anyone[], initiated[], iceflu[] } }

  # window
  checkInSuggested, checkOutSuggested: 'YYYY-MM-DD'
  registrationOpensAt, registrationClosesAt
```

Capacity counters live in a subcollection `events/{eventId}/capacity/{bucket}` mirroring
today's `europeanGatheringRooms` shape (`capacity/reserved/available/updatedAt`), so the
existing transactional reserve/release logic in
[europeanGathering.ts](../frontend/src/lib/europeanGathering.ts) generalizes with minimal
change. `capacityMode: 'total'` uses a single bucket id `total`.

### 2.2 `events/{eventId}/registrations/{regId}`

Same fields as `europeanGatheringRegistrations` today, plus `eventId`. The European Gathering
form logic (`calculateContribution`, `validate…`, `build…Payload`) moves into an
event‑parameterized module that reads `pricing`/`works`/`capacity` from the event doc instead
of constants.

### 2.3 Rules

- `events/{id}`: `read` if `published` (or `isEventAdmin()`); `create/update/delete` if
  `isEventAdmin()`. Keep the strict `hasOnly` shape validation used for registrations today.
- `events/{id}/registrations/{rid}`: same shape as the current
  `europeanGatheringRegistrations` rules (owner create/edit while `pending`, admin manage).
- `events/{id}/capacity/{bucket}`: same transactional rules as `europeanGatheringRooms`,
  but capacity validated against the event doc rather than a hardcoded map.

### 2.4 Admin UI

New `EventsAdminPage` (route gated by `eventadmin`): list events, create/edit (title, kind,
capacity mode + slots/rooms, deposit %, payment details, works rows, pricing), publish/close.
Reuse the registrations table from
[EuropeanGatheringAdminPage.tsx](../frontend/src/pages/EuropeanGatheringAdminPage.tsx),
parameterized by event.

### 2.5 Migration

European Gathering becomes `events/encontro-europeu-2026` seeded from current constants
(rooms, pricing, the new Sept 25/26/28/30 works, 30% deposit). Two options:
- **(a) Big‑bang**: port the page to the generic renderer, redirect `/european-gathering`
  to `/events/encontro-europeu-2026`. Cleaner, more work.
- **(b) Strangler**: keep the EG page, seed the event doc, build the generic renderer for
  *new* events, migrate EG last. Lower risk. **Recommended.**

---

## 3. Item A — consent aging

**Rule:** the signed informed consent is required at registration when the user has
**no approved consent on file** OR their **last approved consent is > 12 months old**.

### 3.1 Where "approved consent" lives — **decided: dedicated ledger (A1)**
Per‑user consent ledger reusing the snapshot pattern:
`users/{uid}/consents/{id}` → `{ status: 'pending'|'approved'|'rejected', uploadedAt,
approvedAt, approvedBy, documentName, documentPath, eventId? }`.

`approvedAt` of the most recent `approved` consent is the aging anchor. A dedicated ledger
(rather than reusing `approvedSnapshots.approvedAt`) keeps "membership approval" and "consent
validity" independent, which item B's two‑phase flow needs (an interview outcome leaves
membership pending while consent stays un‑approved until the church's post‑interview signal).

### 3.2 Logic
Helper `consentRequired(consents, now)`:
```
latestApproved = max(approvedAt where status == 'approved')
return latestApproved == null || (now - latestApproved) > 365 days
```
Used by the registration form to force the consent upload (today it is gated on
`isNovice` only — generalize to `isNovice || consentRequired(...)`).

### 3.3 Touch points
- `users.ts`: consent ledger CRUD + `consentRequired`.
- Registration form: replace the novice‑only consent gate.
- Rules: `users/{uid}/consents/{id}` — owner create (status `pending`); leader/admin set
  `approved|rejected` (ties into item B).

---

## 4. Item B — richer leader decisions (two‑phase)

Today `leaderApproval ∈ {approved, rejected}` is a single terminal decision. We expand it to
**four phase‑1 decisions**, two of which are **non‑terminal** and open a follow‑up thread that
the **reference church resolves after an interview** and the **eventadmin tracks**:

| phase‑1 decision | terminal? | meaning |
|---|---|---|
| `approved` | ✅ yes | approve membership now |
| `approved-interview` | ⏳ no | will approve, but an interview must happen first |
| `approved-psychologist` | ⏳ no | will approve after an interview with a psychologist |
| `rejected` | ✅ yes | reprove |

### 4.1 The interview thread (state machine)

```
phase‑1 = approved            → membership APPROVED        (consent → approved)
phase‑1 = rejected            → membership REJECTED        (consent stays/none)
phase‑1 = approved-interview      ┐
phase‑1 = approved-psychologist   ┘ → membership AWAITING_INTERVIEW (thread opens)
        interview happens offline (with or without psychologist)
        reference church sends phase‑2 signal:
            phase‑2 = approved → membership APPROVED        (consent → approved)
            phase‑2 = rejected → membership REJECTED
```

Registration carries the thread:
```
leaderApproval:            'approved' | 'approved-interview' | 'approved-psychologist' | 'rejected'
leaderApprovalRespondedAt: timestamp                 # phase‑1
interview: {
  required:   'none' | 'standard' | 'psychologist'   # derived from phase‑1
  status:     'awaiting' | 'approved' | 'rejected'    # 'awaiting' until phase‑2
  resolvedAt, resolvedBy
}
leaderComments: [...]                                 # existing thread of notes (both phases)
```

### 4.2 Who signals phase‑2, and how the eventadmin waits
- The **reference church** records phase‑2 on the **same tokenized leader page**
  ([LeaderReviewPage.tsx](../frontend/src/pages/LeaderReviewPage.tsx)): when it loads a
  registration already in `awaiting`, it shows the interview stage ("you chose approve‑with‑
  interview — now record the post‑interview outcome: approve / reject") instead of the phase‑1
  buttons. The leader link stays valid across both phases.
- The **eventadmin** gets an **"Awaiting interview confirmation" queue** in the events admin
  (registrations where `interview.status == 'awaiting'`), with the open comment thread and the
  ability to nudge/record on the church's behalf. This is the "thread to wait for a signal"
  the requester described.
- Consent (item A) is stamped `approved` **only on a terminal approval** — direct `approved`
  or phase‑2 `approved` — never at phase‑1 interview outcomes.

### 4.3 Touch points
- **Functions** ([index.ts](../functions/src/index.ts)): in `europeanGatheringLeaderRespond`
  (l.299) accept the 4 phase‑1 values and a phase‑2 `{ interviewOutcome: 'approved'|'rejected' }`;
  set `interview.required/status` accordingly; stamp consent on terminal approval. Widen
  `LeaderDecision`. `europeanGatheringLeaderView`/`sanitizeRegistrationForLeader` return the
  `interview` block so the page can pick the right stage.
- **lib** ([europeanGathering.ts](../frontend/src/lib/europeanGathering.ts)):
  `LeaderApprovalDecision` union → 4 values; add `interview` to the record + leader view; map/normalize.
- **rules** ([firestore.rules](../firestore.rules)): allow the `interview.*` fields on the
  registration; phase‑2 writes are server‑side (callable) so client rules stay narrow.
- **UI**: leader page two‑stage rendering + badges/labels; events admin "Awaiting interview"
  queue + label/badge maps; localized strings (pt/en/es/it).

Because phase‑2 stamps the consent ledger, **do item A (consent ledger) before item B**.

---

## 5. Proposed implementation order

1. **`eventadmin` role** (§1) — small, unblocks the events admin page. Independently shippable.
2. **Consent ledger + aging** (§3, item A) — needed by item B's "approve → consent valid".
3. **Richer leader decisions** (§4, item B) — builds on the ledger.
4. **Generic events** (§2, item C) — largest; strangler migration (5.b), EG ported last.

Each step is independently shippable and reversible.

Resolved (no longer open):
- **A1** → dedicated `users/{uid}/consents` ledger (§3.1).
- **B1** → two‑phase interview thread + eventadmin "awaiting interview" queue (§4).
- **C1** → strangler migration (§2.5b).

Remaining nits to settle during implementation (not blockers):
- Exact localized wording for the 4 leader buttons and the phase‑2 stage.
- Whether `AWAITING_INTERVIEW` surfaces to the registrant on the dashboard or is admin‑only.
- Event `slug` uniqueness enforcement (rules vs callable).

---

## 6. Task checklist (work through in order)

Each phase is independently shippable; check items off as they land. File references are the
current touch points.

### Phase 1 — `eventadmin` role (§1) — **DONE** (commit pending)
- [x] `systemRole.ts`: added `'eventadmin'` to `SystemRole`, `privilegedSystemRoleOptions`,
      `normalizeSystemRole`, `primarySystemRole` (ranked below `admin`, above `custodian`),
      `hasRequiredRole` (`admin` inherits `eventadmin`).
- [x] `systemRole.test.ts`: cases for `eventadmin` (normalize, primary ranking, `hasRequiredRole`,
      admin inheritance). 6/6 green.
- [x] `firestore.rules`: added `isEventAdmin() = isAdmin() || hasStoredRole('eventadmin')`;
      added `'eventadmin'` to `hasValidUserSystemRole` and `hasValidUserSystemRoles` (cap → 6).
- [x] `AdminUsersPage.tsx`: appears automatically — the role checkboxes render from
      `privilegedSystemRoleOptions` with the raw role string as label (no map to update).
- [x] `App.tsx` + `RoleGate.tsx`: route guard (`requiredRole="eventadmin"`) — **done in Phase 4b**
      (`/admin/events`).
- [x] `NavBar.tsx`: "Eventos/Events/Eventos/Eventi" link gated by `eventadmin` — **done in Phase 4b**.
      (Dashboard entry not needed; the nav link covers it.)
- [x] `docs/firestore-schema.md`: role note flipped to live.

### Phase 2 — consent ledger + aging (§3, item A) — **DONE** (commit pending)
- [x] `consents.ts` (new lib, not `users.ts`): `ConsentRecord`/`ConsentStatus`,
      `CONSENT_VALIDITY_MONTHS = 12`, `consentRequired(consents, now)`, `fetchUserConsents`,
      `createConsentRecord` (status `pending`).
- [x] `consents.test.ts`: boundary at exactly 12 months + none/fresh/stale/most-recent (6/6 green).
- [x] `firestore.rules`: `users/{uid}/consents/{id}` — owner creates `pending` (validated payload,
      `uploadedAt == request.time`); `update` (approve/reject) only `isUserAdmin()`/`isEventAdmin()`
      (Phase 3 leader path is server-side via callable); read owner/admin/eventadmin.
- [x] **`storage.rules`: unchanged by design** — the consent file keeps uploading to the
      registration path (`europeanGatheringRegistrations/{id}/consentDocument-*`, already allowed);
      the ledger entry just **references** that path + name. Avoids touching the live upload flow.
- [x] EG form: gate is now `isNovice || consentRequired(consents)`; non-novice aging case shows a
      generic `consentRequiredNote` (4 langs). `createEuropeanGatheringRegistration`/`update…` create
      a `pending` ledger entry whenever a consent file is uploaded (with `userId`).
- [x] `validateEuropeanGatheringForm` takes a `requireConsent` flag; `buildEuropeanGatheringPayload`
      stores consent whenever provided (no longer gated on `isNovice`).
- [x] `docs/firestore-schema.md`: `users/{uid}/consents` marked delivered.

> **Interim behaviour until Phase 3:** nothing approves consents yet, so `consentRequired`
> returns `true` for everyone (no approved consent on file) → every EG registrant is asked to
> upload a signed consent. This is spec-correct (item A asks unless a valid *approved* consent
> exists) and resolves once Phase 3's terminal approval stamps consents `approved`. If we want a
> softer interim (e.g. treat a <12-month membership approval as satisfying consent), that's a
> deliberate bridge to add — flagged, not yet built.

### Phase 3 — richer leader decisions, two‑phase (§4, item B) — **DONE** (commit pending)
- [x] `europeanGathering.ts`: `LeaderApprovalDecision` → 4 values; `InterviewRequirement`/
      `InterviewStatus`/`InterviewOutcome`/`RegistrationInterview` types; `interview` on the
      record + leader view; `mapInterview` + normalize; callable + `submit…` take `interviewOutcome`.
- [x] `functions/src/index.ts`: accept the 4 phase‑1 decisions + phase‑2 `interviewOutcome`
      (guarded by `failed-precondition` when no interview is pending); set `interview.required/
      status/resolvedAt/resolvedBy`; `sanitizeInterview` returns the block from view/respond;
      `approveUserConsentForRegistration` stamps the user's consent ledger (`eventId == regId`)
      on terminal approval (direct `approved` or phase‑2 `approved`) — **closes Phase 2's interim**.
- [x] **`firestore.rules`: no change needed** — the respond callable writes via Admin SDK
      (bypasses rules); `interview` is not owner‑editable nor part of the create payload.
- [x] `LeaderReviewPage.tsx`: two‑stage rendering — phase‑1 four buttons (approve / approve+
      interview / approve+psychologist / reject); phase‑2 outcome buttons when
      `interview.status == 'awaiting'`; interview banner + badges.
- [x] `EuropeanGatheringAdminPage.tsx`: 4‑decision label/badge maps + `interviewBadge`
      ("Aguardando entrevista/psicólogo" / "Pós‑…: aprovado/rejeitado") on all three views.
- [~] Localized strings — **tracked debt, see §7.1**: the leader review page is currently
      English‑only; it must be translated into pt/en/es/it.
- [~] State‑machine tests — **tracked debt, see §7.2**: no unit tests yet for the two‑phase
      transitions; to be added.

### Phase 4 — generic events (§2, item C) — strangler, sub-stepped

**4a — events data model + lib + rules (foundation) — DONE (commit pending)**
- [x] `events.ts` lib: event types (`EventRecord`/`EventInput`, `LocalizedText`, `EventWork`,
      `EventPricing`, `EventPayment`, `EventRoom`, `EventKind`, `CapacityMode`, `EventStatus`);
      `slugify`; `validateEventInput` (pure); CRUD (`fetchEvents`/`fetchPublishedEvents`/`fetchEvent`/
      `createEvent`/`updateEvent`/`deleteEvent`). **Slug is the doc id** → Firestore enforces
      uniqueness (settles the §5 "slug uniqueness" nit).
- [x] `events.test.ts`: `slugify` + `validateEventInput` (capacity mode, deposit range, works). 8/8.
- [x] `firestore.rules`: `events/{id}` read (`isEventAdmin() || status=='published'`), write (`isEventAdmin()`).
- [x] `docs/firestore-schema.md`: `events/{id}` doc + rules marked delivered.

**4b — EventsAdminPage + role wiring — DONE (commit pending)**
- [x] `events/form.ts` + `form.test.ts`: `EventFormValues`, `parseNumberList`, `buildEventInput`,
      `prefillEventForm` (percent↔rate, slug derivation, round-trip). 4/4.
- [x] `EventsAdminPage.tsx`: list + create/edit/delete with the full config form (title 4-lang,
      slug/status/kind, capacity mode + slots/rooms, deposit %, payment, dynamic works rows,
      pricing incl. worksByCount tiers, suggested check-in/out). Portuguese (matches EG admin).
- [x] `App.tsx`: `/admin/events` under `RoleGate requiredRole="eventadmin"`; `NavBar` link gated
      by `eventadmin` (the deferred Phase 1 items — now done).

**4c — generic registrations + capacity** (split: 4c.1 pure logic / 4c.2 Firestore + UI)

_4c.1 — pure logic — DONE (commit pending)_
- [x] `eventRegistrations.ts`: `calculateEventContribution`/`calculateEventNightCount`/
      `calculateEventCautionDeposit` (driven by `event.pricing`/`works`; **parity with the EG
      numbers** — same 340 total in the test); capacity model (`eventCapacityBuckets`,
      `totalEventCapacity`, `buildEventCapacitySnapshot`, `totalEventSlotsAvailable`; total bucket
      vs per-room); `validateEventRegistration` (+ `requireConsent`).
- [x] `eventRegistrations.test.ts`: 10 cases (EG-parity contribution, meals/spiritual, deposit,
      capacity total/rooms/clamp, validation + consent).

_4c.2 — Firestore persistence — DONE (commit pending)_
- [x] `firestore.rules`: `events/{id}/registrations/{rid}` (owner-while-pending + eventadmin) and
      `events/{id}/capacity/{bucket}` (public read; invariant-checked writes).
- [x] `storage.rules`: `events/{eventId}/registrations/...` (+ `ownsPendingEventRegistration` helper).
- [x] `eventRegistrations.ts` CRUD: uploads, `createEventRegistration`/`fetchMyEventRegistration`/
      `updateMyEventRegistration`/`fetchEventRegistrations`/`fetchEventCapacity`/
      `updateEventRegistrationStatus`/`deleteEventRegistration`; capacity reserve/release
      transactions (`adjustEventCapacity`, total bucket vs per-room); consent-ledger creation on
      upload (generalized from `europeanGathering.ts`).

_4c.3 — generic registration renderer — DONE (commit pending)_
- [x] `components/InfoTooltip.tsx`: extracted shared component (EG untouched; unify at 4e).
- [x] `pages/events/registrationCopy.ts`: compact 4-language form chrome copy (labels, errors,
      upload strings) — event title/works/dates come from the event doc.
- [x] `pages/EventRegistrationPage.tsx` at `/events/:slug`: config-driven form — personal data +
      leader-email tooltip, status toggles, attendance mode, dates (event suggested), **slots
      indicator** (fetchEventCapacity), works (localized from event.works), documents
      (FileUploadField), **consent gate** (`isNovice || consentRequired`), contribution summary +
      **caution deposit (event rate %)** + payment tooltip; create/edit via the 4c.2 CRUD.
- [x] `App.tsx`: `/events/:slug` inside the authenticated Shell.

**Events vertical is now usable end-to-end**: eventadmin creates an event (4b) → members register
at `/events/:slug` (4c.3) → consent ledger + capacity tracked (4c.2/Phase 2). Remaining: seed the
EG event + dashboard links (4d), then migrate the bespoke EG page onto this renderer (4e).

**4d — seed + dashboard — DONE (commit pending)**
- [x] `scripts/events/seed-event.mjs`: seeds `events/encontro-europeu-2026` from the EG constants
      (Sep 25/26/28/30 works, 30% deposit, 84 total slots, 70/30 rates, worksByCount tiers,
      payment incl. real IBAN/SWIFT, suggested 24 Sep→1 Oct). firebase-admin, **dry-run by default**,
      `--live` to write, idempotent. **Seeded as `draft`** so the leaner generic path is not exposed
      to members before the 4e parity check.
- [x] `DashboardPage.tsx`: approved members see a card per **published** event → `/events/:slug`
      (dormant until an event is published; the bespoke EG card stays until 4e).

**4e — strangler migration (last)**

Decided:
- **Public hero / anonymous registration is a dead remnant — drop it.** The `/european-gathering`
  route already requires login (`EuropeanGatheringRoute` redirects anonymous → `/login`) and renders
  with `showPublicHero={false}`, so the hero branch never shows. It is leftover from the old
  "register without an account" design, which we no longer want. 4e removes the `showPublicHero`
  prop + hero branch when retiring the bespoke page; the generic renderer is already login-gated. No
  parity work for this item.

Parity gaps still to settle (keep in the renderer vs drop) before cutover:
- payment-details display (IBAN/SWIFT/beneficiary/causale — drive from `event.payment`)
- success screen with payment instructions + registration number
- privacy-consent (GDPR) text
- program/directions resource PDFs (currently blank placeholders)
- draft saving (localStorage)
- novice consent-form download link (would need an event-level consent-form URL)

Steps:
- [ ] Close the chosen parity gaps in `EventRegistrationPage`.
- [ ] Publish the seeded event; point `/european-gathering` → `/events/encontro-europeu-2026`;
      swap the dashboard card; retire the bespoke EG page; unify the duplicated `InfoTooltip`.
- [ ] `docs/firestore-schema.md` + `docs/encontroEuropeu.md`: mark EG as an `events` instance.

---

## 7. Deferred follow-ups (tracked debt — do not forget)

### 7.1 Translate the leader review page (pt/en/es/it)
[LeaderReviewPage.tsx](../frontend/src/pages/LeaderReviewPage.tsx) is currently English-only.
It must be localized into the four site languages like the registration page, including the
four phase-1 decision buttons, the phase-2 outcome buttons, the interview banner, status badges,
and feedback/error strings. (The registration leader link could also carry the registrant's
`locale` so the page opens in the right language.)

### 7.3 Harden `events/{id}/capacity` bucket integrity
The capacity write rule enforces the invariant (`reserved` in range, `available == capacity -
reserved`) but does **not** validate `capacity` against the event doc, so a signed-in user could
create a bucket with an arbitrary `capacity` and over-book. Low severity (counter integrity, not
data exposure). Tighten by cross-reading the event doc in the rule (straightforward for `total`
mode; per-room needs array lookup) or by moving capacity writes server-side.

### 7.2 Unit tests for the two-phase leader state-machine
No automated tests cover the Phase 3 transitions yet. Add tests for: phase-1 `approved` →
terminal + consent stamped; `rejected` → terminal, no consent; `approved-interview`/
`approved-psychologist` → `interview.required` set + `status: awaiting`, **not** terminal;
phase-2 `interviewOutcome` only allowed when awaiting (else `failed-precondition`); phase-2
`approved` → consent stamped, `rejected` → not. Pure helpers (`interviewRequirementFor`,
`isTerminalApproval`) are trivially unit-testable; the callable path needs a functions test
harness (e.g. `firebase-functions-test` + Firestore emulator).
