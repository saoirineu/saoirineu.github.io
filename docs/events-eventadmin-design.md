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
- [ ] `App.tsx` + `RoleGate.tsx`: route guard (`requiredRole="eventadmin"`) — **deferred to
      Phase 4** (no events admin page/route exists yet; `RoleGate` is already generic).
- [ ] `NavBar.tsx` / `DashboardPage.tsx`: entry point — **deferred to Phase 4** (no page yet).
- [x] `docs/firestore-schema.md`: role note flipped to live.

### Phase 2 — consent ledger + aging (§3, item A)
- [ ] `users.ts`: `ConsentRecord` type; create (status `pending`) / list; `consentRequired(consents, now)`.
- [ ] unit test: `consentRequired` boundary at exactly 12 months (none / fresh / stale).
- [ ] `firestore.rules`: `users/{uid}/consents/{id}` — owner create `pending`; `approved|rejected`
      only via callable/admin.
- [ ] `storage.rules`: consent document path under `users/{uid}/consents/...`.
- [ ] EG registration form: replace the novice‑only consent gate with `isNovice || consentRequired(...)`.
- [ ] `docs/firestore-schema.md`: add `users/{uid}/consents`.

### Phase 3 — richer leader decisions, two‑phase (§4, item B)
- [ ] `europeanGathering.ts`: `LeaderApprovalDecision` → 4 values; add `interview` block to
      record + leader view; normalize/map.
- [ ] `functions/src/index.ts`: accept 4 phase‑1 values + phase‑2 `interviewOutcome`; set
      `interview.required/status`; stamp consent on terminal approval; return `interview` from
      the view/sanitize.
- [ ] `firestore.rules`: allow `interview.*` on the registration (phase‑2 written server‑side).
- [ ] `LeaderReviewPage.tsx`: two‑stage rendering (phase‑1 four buttons / phase‑2 outcome) + badges.
- [ ] `EuropeanGatheringAdminPage.tsx`: label/badge maps + "Awaiting interview confirmation" queue.
- [ ] localized strings (pt/en/es/it); test the state‑machine transitions.

### Phase 4 — generic events (§2, item C) — strangler
- [ ] `events.ts` lib: event/registration/capacity types; CRUD; event‑parameterized
      `calculateContribution`/`validate`/`buildPayload`; transactional capacity reserve/release
      (generalized from `europeanGathering.ts`).
- [ ] `firestore.rules`: `events/{id}` (read published or `isEventAdmin`; write `isEventAdmin`);
      `events/{id}/registrations/{rid}` (owner/admin, mirror EG); `events/{id}/capacity/{bucket}`
      (transactional, validated against the event doc).
- [ ] `storage.rules`: `events/{eventId}/registrations/...` document paths.
- [ ] `EventsAdminPage.tsx`: list/create/edit/publish (title, kind, capacity mode + slots/rooms,
      deposit %, payment, works rows, pricing).
- [ ] Generic registration renderer (reuse `FileUploadField`, `InfoTooltip`, contribution UI).
- [ ] Seed `events/encontro-europeu-2026` from current constants (Sep 25/26/28/30, 30% deposit, rooms→capacity).
- [ ] `DashboardPage.tsx`: list published events to approved members (generalize the gathering card).
- [ ] **Migrate EG last**: port `/european-gathering` onto the generic renderer, then redirect.
- [ ] `docs/firestore-schema.md` + `docs/encontroEuropeu.md`: mark EG as an `events` instance.
