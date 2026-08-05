# portal-mail relay

Mail endpoint that runs on the **santodaime.it cPanel hosting**, not in this
repo's runtime. Cloud Functions cannot reach the SMTP server (Serverplan blocks
Google's IPs); this script shares a machine with the mail server, so it can.

Full background: [`docs/email-delivery.md`](../../docs/email-delivery.md).

## Files

| File | In git? | Goes to |
| --- | --- | --- |
| `relay.php` | yes | `public_html/portal-mail/relay.php` |
| `relay-config.php` | **no — gitignored, holds the shared secret** | `public_html/portal-mail/relay-config.php` |

Upload both through cPanel → File Manager. No build step.

If `relay-config.php` is missing locally, recreate it with the value of
`MAIL_RELAY_TOKEN` from `docs/credentials/mail-relay.env`:

```php
<?php
if (!defined('RELAY_ENTRY')) {
    http_response_code(404);
    exit;
}

define('RELAY_TOKEN', '<the token>');
```

## Contract

```
POST /portal-mail/relay.php
X-Relay-Token: <shared secret>
Content-Type: application/json

{ "to": "a@b.com" | ["a@b.com", ...], "subject": "...", "text": "..." }
```

Responds `{"sent":true,"recipients":N}`, or a JSON `error` with `400` (bad
payload), `401` (bad token), `405` (not POST), `413` (oversized), `429` (rate
limited), `502` (local MTA refused).

## Testing changes before uploading

`mail()` cannot be stubbed in place, so substitute it and run the rest verbatim:

```bash
SB=$(mktemp -d)/pub && mkdir -p $SB/portal-mail
perl -pe 's/\$sent = mail\(/\$sent = test_mail(/' relay.php > $SB/portal-mail/relay.php
cp relay-config.php $SB/portal-mail/
echo '<?php function test_mail($to,$s,$m,$h="",$p=""){ error_log("MAIL $to :: $h"); return true; }' > $SB/prepend.php
php -S 127.0.0.1:8899 -t $SB -d auto_prepend_file=$SB/prepend.php
```

Then exercise it — auth, validation and rate limiting all run unmodified:

```bash
TOKEN=$(grep MAIL_RELAY_TOKEN ../../docs/credentials/mail-relay.env | cut -d= -f2)
U=http://127.0.0.1:8899/portal-mail/relay.php
curl -s -o /dev/null -w '%{http_code}\n' $U                                    # 405
curl -s -o /dev/null -w '%{http_code}\n' -X POST $U -H 'X-Relay-Token: no' -d '{}'  # 401
curl -s -X POST $U -H "X-Relay-Token: $TOKEN" \
  -d '{"to":"a@b.com\nBcc: evil@x.com","subject":"s","text":"t"}'              # 400
```

Verify `php -l relay.php` passes before uploading.
