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

`sendPortalMail()` throws when the relay answers anything other than 2xx, and
the message includes the status and body, so Cloud Logging shows the reason
rather than a bare `INTERNAL`.

There is **no fallback** for the shared paths: if the hosting is down, mail
stops. The one exception is account confirmation — the frontend falls back to
Firebase's own `sendEmailVerification` when the callable fails
(`deliverVerificationEmail()` in
[`frontend/src/providers/AuthProvider.tsx`](../frontend/src/providers/AuthProvider.tsx)),
so nobody is locked out of a new account by a mail outage.

If the hosting ever becomes unreliable, the alternative is a transactional
provider (Brevo, Resend, Mailchimp Transactional). That is a `sendPortalMail()`
change plus new secrets; the existing SPF/DKIM already cover sending as
`info@santodaime.it`.

## Diagnosing

```bash
# is the endpoint alive? (405 = up and refusing GET, as designed)
curl -s -o /dev/null -w '%{http_code}\n' https://www.santodaime.it/portal-mail/relay.php

# what did the functions see?
gcloud logging read 'resource.labels.service_name="sendverificationemailcallable" AND severity>=WARNING' \
  --project sao-irineu --limit 10 --freshness=1h
```

The relay's own audit log is at `~/portal-mail-data/relay.log` on the hosting
(File Manager, one level above `public_html`), one tab-separated line per
request: timestamp, outcome, caller IP, recipients, subject.
