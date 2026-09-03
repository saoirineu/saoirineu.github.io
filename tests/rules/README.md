# Security rules tests

Executable checks for `firestore.rules` and `storage.rules`, run against throwaway
Firebase emulators. Never touches the live project.

```bash
make test-rules          # from the repo root
npm --prefix tests/rules test
npm --prefix tests/rules test -- firestore   # one file
```

First run installs deps and downloads the emulators. Needs **JDK 21 or newer** —
`run.sh` locates one automatically (`/usr/libexec/java_home`, then Homebrew) and tells
you how to install one if it cannot.

## What the tags mean

Each test name carries a tag:

- **`[guard]`** — behaviour that is already correct. These pass today and must keep
  passing. They are the safety net while the rules are being changed.
- **`[C1]` `[C2]` `[C3]` `[H1]`…** — a finding from `docs/security/README.md`. These
  encode the **desired** end state, so they **fail on purpose** until that finding is
  fixed. They are the acceptance criteria, not a broken suite.

So a red run is expected right now. What matters is *which* tests are red:

```
82 tests — 51 passing, 31 failing
[C3] 7   [M1] 6   [C1] 4   [H3] 3   [H2] 3   [H1] 3   [C2] 3   [M2] 2
```

Working through a finding means watching its tag go green while every `[guard]` stays
green. When all 82 pass, C1–C3, H1–H3 and M1–M2 are closed.

`[M2]` is the exception: it cannot go green from a rules change alone. Capacity
accounting has to move into a Cloud Function first — see M2 in the findings doc.

## Layout

| file | covers |
| --- | --- |
| `helpers.ts` | emulator setup, fixture identities, a valid registration payload |
| `firestore.test.ts` | `users`, `members`, `settings`, events, registrations, consents, default-deny |
| `storage.test.ts` | registration documents, profile documents, public `docs/`, default-deny |

Identities are seeded per test (`beforeEach` clears and reseeds), so tests are
order-independent. Two of them matter more than they look:

- `ALICE` carries `systemRole` and `approvalStatus` **already set** — the state where
  guards written with `changedKeys()` do work.
- `NEWBIE` is a fresh signup carrying **only an email** — the state where they do not.
  That difference is finding C3.

## Writing a new test

`assertSucceeds` / `assertFails` from `@firebase/rules-unit-testing` wrap a normal
Firebase SDK call. Seed with `testEnv.withSecurityRulesDisabled` — note its callback's
return value is discarded, so assign to an outer variable if you need to read
something back.

Add a test whenever you touch a rule. A rule that is read and reasoned about is not
tested: C3 was reviewed by eye and judged safe before this suite proved otherwise.
