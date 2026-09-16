# Email delivery

Every portal email — signup confirmation, ICEFLU approval and needs-revision
notices, leader review requests, payment verification — is sent by Cloud
Functions through a **PHP relay hosted on the santodaime.it cPanel account**.

Cloud Functions do **not** speak SMTP. That is deliberate and non-obvious, so
the reasoning is recorded below.

## Why not SMTP

Until 2026-08-03 the functions sent through Gmail. That day the SMTP secrets
were switched to the organization's own mailbox (`mail.santodaime.it:465`,
`info@santodaime.it`) so that approval emails carrying tokenized action links
would come from the organization's domain rather than a personal account.

It never delivered a single message. Serverplan filters mail by source IP and
refuses Google Cloud's egress, with two different symptoms:

| Region | Symptom |
| --- | --- |
| `us-central1` (callables) | Connects, authenticates, then `550 X-Warning: <ip> is listed at SPauthBL` at `RCPT TO` |
| `europe-west1` (Firestore triggers) | TCP connection dropped outright; nodemailer times out |

The mailbox itself is healthy — the same credentials complete
`EHLO`/`AUTH`/`MAIL FROM`/`RCPT TO` from an ordinary connection. It is purely
source-IP filtering, so only Serverplan can lift it.

Things that were tried and did **not** help:

- **Moving the callables to `europe-west1`.** Reverted; that region is worse
  (packets dropped rather than refused).
- **Blaming DNS.** DKIM, SPF, DMARC and PTR are all valid. The `_dmarc` record
  added on 2026-08-03 is unrelated: `p=none` is a monitor-only *receiver*
  policy and cannot reject a submission or drop a connection. It looked guilty
  only because it landed the same morning as the SMTP switch.

## How the relay works

`santodaime.it` and `mail.santodaime.it` resolve to the same machine
(`86.107.32.140`), so a PHP script on the hosting account hands mail to the
local MTA. No cloud IP appears in the path, the message is DKIM-signed on the
way out, and SPF already authorizes that server.

```
Cloud Function ──HTTPS POST──> https://www.santodaime.it/portal-mail/relay.php
  (X-Relay-Token header)              │
                                      └── PHP mail() ──> local Exim ──> recipient
```

- Caller: `sendPortalMail()` in [`functions/src/index.ts`](../functions/src/index.ts).
- Endpoint source: [`scripts/portal-mail/relay.php`](../scripts/portal-mail/relay.php).
- Deployed at `public_html/portal-mail/` on the cPanel account.

The relay is POST-only, compares the shared secret with `hash_equals`, validates
every recipient with `FILTER_VALIDATE_EMAIL` (which also blocks header
injection), caps sending at 120 messages/hour, and appends an audit line per
request. Logs and rate-limit state live in `~/portal-mail-data/`, above the
document root, so they are never web-readable.

## Installing or updating the relay

The two files are uploaded through **cPanel → File Manager →
`public_html/portal-mail/`**:

| File | In git? | Contents |
| --- | --- | --- |
| `relay.php` | yes | the endpoint |
| `relay-config.php` | **no — gitignored** | the shared secret |

After editing `relay.php`, re-upload it. Nothing else is needed; there is no
build step on the hosting side.

## Rotating the shared secret

The token exists in **two places that must match**, or mail stops:

1. `MAIL_RELAY_TOKEN` in Firebase Secret Manager
2. `RELAY_TOKEN` in `relay-config.php` on the hosting

To rotate:

```bash
# 1. put the new value in docs/credentials/mail-relay.env (gitignored)
make mail-relay-secret          # pushes it to Secret Manager
make deploy-functions           # functions pick up the new secret version
# 2. update relay-config.php with the same value and re-upload it
```

Secrets only take effect after a redeploy — the functions keep using the
version they were deployed with.

## Failure modes

Since September 2026 the hosting's bot protection intermittently refuses requests
from Google Cloud before they reach `relay.php`: some get a `403` page titled
"Visitor anti-robot validation", others never open a connection (`fetch failed`
after ~10 s). The relay's own log has no line for those requests. A support
ticket to Serverplan asks them to exempt `/portal-mail/` from that protection.

`sendPortalMail()` throws when the relay answers anything other than 2xx. It is
called only by the mail queue; everything else calls `deliverOrQueue()`.

## The mail queue

Every portal email goes through `deliverOrQueue()`
([`functions/src/mailQueueRuntime.ts`](../functions/src/mailQueueRuntime.ts)),
which writes it to `mailQueue/{id}` and tries it at once. Account confirmation and the
Firestore-trigger emails (membership decisions, admin notices, review requests) get a
second try two seconds later, because the hosting's refusals are often per request;
the emails sent while a leader answers a review do not, to keep that page quick. When
the relay still refuses, `retryQueuedMail` (every 5 minutes) keeps trying. Attempts
made on the spot do not advance the schedule:

| After failed attempt | 1 | 2 | 3 | 4 | 5 | 6+ |
| --- | --- | --- | --- | --- | --- | --- |
| Most emails | 2 min | 5 min | 10 min | 15 min | 30 min | hourly |
| Confirmation email | 10 min | 20 min | 30 min | hourly | | |

An email stops being retried when:

- **it is delivered** (`status: sent`);
- **it no longer applies** (`cancelled`): before every attempt a guard re-checks the
  data, so a late email never contradicts it — a decision email only goes out if the
  profile still has that status, an admin notice only while the submission is still
  pending, a review request only until the leader or the administration has answered,
  a confirmation link only while the address is unconfirmed;
- **it expires** (`failed`, logged as `MAIL_GAVE_UP`): after 24 hours for a
  confirmation link, 7 days for leader and payment review requests, 3 days otherwise.

Queueing is idempotent for triggers (the document id comes from the event id, so a
redelivered event does not send twice), and each attempt is claimed in a transaction,
so the immediate attempt and a scheduled retry never send the same email together.
If the relay accepts an email but the response is lost, the retry sends it again:
a rare duplicate is preferred to a lost email.

The queue is closed to every client in the rules: queued emails contain confirmation
and review links.

### Account confirmation

A person waiting on the login page should not depend on retries, so:

1. The callable queues our confirmation email (one per account, a newer link
   replaces an older one), tries it at once and, if refused, once more two seconds
   later. The page says the email is being sent and can take up to 30 seconds.
2. If ours still did not leave, the login page asks Firebase to send its own
   confirmation email right away (plainer, in English, from
   `noreply@sao-irineu.firebaseapp.com`). Ours keeps retrying in the background after
   10, 20 and 30 minutes, then hourly, and stops as soon as the address is
   confirmed — usually through Firebase's link — so most people get one email.
3. The modal then says one of four things:
   - **sent** (ours left): check your inbox and spam;
   - **fallback sent** (ours refused twice, Firebase's left): our mail server is
     temporarily overloaded, an alternative email came from
     noreply@sao-irineu.firebaseapp.com, and ours will follow after 10, 20, 30 minutes
     and then hourly until the account is confirmed;
   - **queued** (Firebase refused too): our mail server is temporarily overloaded,
     nothing to do, ours is retried after 10, 20, 30 minutes and then hourly;
   - **failed** (nothing went out, nothing queued): try again in a few minutes, or
     wait longer if too many requests were made.
4. The resend button waits a minute after every attempt (five after "too many
   requests"): Firebase refuses links requested in quick succession, which is how both
   routes failed together on 2026-09-14.

If the hosting stays unreliable, the lasting alternative is a transactional
provider (Brevo, Resend, Mailchimp Transactional): a `sendPortalMail()` change plus
new secrets, with SPF/DKIM added for `info@santodaime.it`.

## Diagnosing

```bash
# is the endpoint alive? (405 = up and refusing GET, as designed)
curl -s -o /dev/null -w '%{http_code}\n' https://www.santodaime.it/portal-mail/relay.php

# what did the functions see?
gcloud logging read 'resource.labels.service_name="sendverificationemailcallable" AND severity>=WARNING' \
  --project sao-irineu --limit 10 --freshness=1h
```

```bash
# emails the queue is retrying, delivered late, cancelled, or gave up on
gcloud logging read 'textPayload:"MAIL_RETRY_SCHEDULED" OR textPayload:"MAIL_DELIVERED_AFTER_RETRY" OR textPayload:"MAIL_CANCELLED" OR textPayload:"MAIL_GAVE_UP"' \
  --project sao-irineu --limit 50 --freshness=1d
```

The queue documents themselves (recipients, subject, attempts, `lastError`) are in
the Firebase console under Firestore → `mailQueue`.

The relay's own audit log is at `~/portal-mail-data/relay.log` on the hosting
(File Manager, one level above `public_html`), one tab-separated line per
request: timestamp, outcome, caller IP, recipients, subject.
