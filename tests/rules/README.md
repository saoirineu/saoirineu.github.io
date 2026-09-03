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

- **`[guard]`** — behaviour that is already correct and must keep passing. Most of the
  suite is this: the regression net around the rules.
- **a finding tag** (`[M2]`) — a gap from the security review that is not closed yet.
  These are written with `it.fails`, so they pass *because* the assertion still fails.
  When someone closes the gap, the test flips to failing and tells them to drop the
  marker. The suite stays green and the debt stays visible.

```
make test-rules     # 83 tests, all passing
make test           # + frontend (104) + functions (9)
```

A red run means a real regression, so treat it as one.

Only `[M2]` is open today: capacity accounting still runs client-side inside the
registration transaction (`adjustEventCapacity` in `lib/eventRegistrations.ts`), so
tightening that rule to event admins would break registration until the accounting
moves server-side.

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
