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
you how to install one if it cannot. The lookup lives in `tests/with-jdk21.sh`, which
`make test-mail-queue` uses too.

## What the tags mean

Each test name carries a tag:

- **`[guard]`** — behaviour that is already correct and must keep passing. Most of the
  suite is this: the regression net around the rules.
- **a finding tag** (`[C3]`, `[M2]`…) — the security-review finding the test pins down.
  While a finding is open, its test is written with `it.fails`, so it passes *because*
  the assertion still fails; closing the gap flips it to failing, and the fix drops the
  `.fails`. The suite stays green and the debt stays visible.

```
make test-rules     # 127 tests, all passing
make test           # + mail queue (13) + frontend (169) + functions (64)
```

A red run means a real regression, so treat it as one.

No finding is open today: `[M2]`, the last one, closed when capacity accounting moved
server-side, so every tagged test is now a plain regression guard.

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
