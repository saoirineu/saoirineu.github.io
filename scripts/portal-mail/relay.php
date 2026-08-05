<?php
/**
 * São Irineu portal mail relay.
 *
 * Serverplan refuses SMTP from Google's IP ranges (SPauthBL, plus a firewall
 * drop), so Cloud Functions cannot reach mail.santodaime.it directly. This
 * endpoint runs on the hosting account itself — the same machine as the mail
 * server — and hands messages to the local MTA, which puts no cloud IP in the
 * path and gets the mail DKIM-signed on the way out.
 *
 * Install: upload this file and relay-config.php to public_html/portal-mail/.
 * Callers POST JSON with the X-Relay-Token header; see sendPortalMail() in
 * functions/src/index.ts.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const MAX_BODY_BYTES  = 262144;   // 256 KB is far above any portal message
const MAX_RECIPIENTS  = 25;
const RATE_LIMIT_MAX  = 120;      // messages per window
const RATE_LIMIT_SECS = 3600;
const MAIL_FROM_ADDR  = 'info@santodaime.it';
const MAIL_FROM_NAME  = 'São Irineu - ICEFLU Italia';

/** State lives outside the document root so the log is never web-readable. */
function state_dir(): string {
    $root = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__;
    $dir  = rtrim(dirname($root), '/') . '/portal-mail-data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return is_dir($dir) ? $dir : sys_get_temp_dir();
}

function fail(int $status, string $error): never {
    http_response_code($status);
    echo json_encode(['error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function audit(string $outcome, string $recipients, string $subject): void {
    $line = sprintf(
        "%s\t%s\t%s\t%s\t%s\n",
        gmdate('c'),
        $outcome,
        $_SERVER['REMOTE_ADDR'] ?? '-',
        $recipients,
        str_replace(["\r", "\n", "\t"], ' ', $subject)
    );
    @file_put_contents(state_dir() . '/relay.log', $line, FILE_APPEND | LOCK_EX);
}

/**
 * Sliding-window cap. A leaked token should not be able to turn the domain
 * into an open relay faster than someone notices the log.
 */
function rate_limit_ok(int $count): bool {
    $path = state_dir() . '/rate.json';
    $now  = time();

    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return true; // never let bookkeeping trouble block real mail
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return true;
        }
        $stamps = json_decode((string) stream_get_contents($handle), true);
        if (!is_array($stamps)) {
            $stamps = [];
        }
        $stamps = array_values(array_filter(
            $stamps,
            static fn ($t): bool => is_int($t) && $t > $now - RATE_LIMIT_SECS
        ));

        if (count($stamps) + $count > RATE_LIMIT_MAX) {
            return false;
        }
        for ($i = 0; $i < $count; $i++) {
            $stamps[] = $now;
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, (string) json_encode($stamps));
        fflush($handle);
        return true;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

// ---------------------------------------------------------------- request

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail(405, 'method not allowed');
}

$configPath = __DIR__ . '/relay-config.php';
if (!is_file($configPath)) {
    fail(500, 'relay not configured');
}
define('RELAY_ENTRY', true);
require $configPath; // defines RELAY_TOKEN

if (!defined('RELAY_TOKEN') || RELAY_TOKEN === '') {
    fail(500, 'relay not configured');
}

$presented = $_SERVER['HTTP_X_RELAY_TOKEN'] ?? '';
if (!is_string($presented) || !hash_equals(RELAY_TOKEN, $presented)) {
    audit('unauthorized', '-', '-');
    fail(401, 'unauthorized');
}

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > MAX_BODY_BYTES) {
    fail(413, 'payload too large');
}

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    fail(400, 'body must be a JSON object');
}

// ---------------------------------------------------------------- validate

$recipients = $payload['to'] ?? null;
if (is_string($recipients)) {
    $recipients = [$recipients];
}
if (!is_array($recipients) || $recipients === []) {
    fail(400, '"to" must be an address or a non-empty array of addresses');
}
if (count($recipients) > MAX_RECIPIENTS) {
    fail(400, 'too many recipients');
}

$clean = [];
foreach ($recipients as $address) {
    if (!is_string($address)) {
        fail(400, 'recipient addresses must be strings');
    }
    $address = trim($address);
    // Header injection lives in newlines; a valid address cannot contain them.
    if ($address === '' || !filter_var($address, FILTER_VALIDATE_EMAIL)) {
        fail(400, 'invalid recipient address');
    }
    $clean[] = $address;
}
$clean = array_values(array_unique($clean));

$subject = $payload['subject'] ?? '';
$text    = $payload['text'] ?? '';
if (!is_string($subject) || trim($subject) === '') {
    fail(400, '"subject" is required');
}
if (!is_string($text) || trim($text) === '') {
    fail(400, '"text" is required');
}
$subject = str_replace(["\r", "\n"], ' ', $subject);

if (!rate_limit_ok(count($clean))) {
    audit('rate-limited', implode(',', $clean), $subject);
    fail(429, 'rate limit exceeded');
}

// ---------------------------------------------------------------- send

$encodedSubject = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n")
    : '=?UTF-8?B?' . base64_encode($subject) . '?=';

$fromName = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader(MAIL_FROM_NAME, 'UTF-8', 'B', "\r\n")
    : '=?UTF-8?B?' . base64_encode(MAIL_FROM_NAME) . '?=';

// An RFC 2047 encoded-word is not interpreted inside a quoted string, so quote
// the display name only when it stayed plain ASCII.
$fromDisplay = strncmp($fromName, '=?', 2) === 0 ? $fromName : '"' . $fromName . '"';

$headers = implode("\r\n", [
    'From: ' . $fromDisplay . ' <' . MAIL_FROM_ADDR . '>',
    'Reply-To: ' . MAIL_FROM_ADDR,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: saoirineu-portal-relay',
]);

$body = str_replace(["\r\n", "\r"], "\n", $text);
$body = str_replace("\n", "\r\n", $body);

$to   = implode(', ', $clean);
$sent = mail($to, $encodedSubject, $body, $headers, '-f' . MAIL_FROM_ADDR);

if (!$sent) {
    audit('send-failed', $to, $subject);
    fail(502, 'the local mail system rejected the message');
}

audit('sent', $to, $subject);
echo json_encode(['sent' => true, 'recipients' => count($clean)], JSON_UNESCAPED_UNICODE);
