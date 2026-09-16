import { describe, expect, it } from 'vitest';

import {
  RESEND_COOLDOWN_MS,
  TOO_MANY_COOLDOWN_MS,
  formatCountdown,
  verificationCooldownMs,
  verificationView
} from './verification';

describe('confirmation modal', () => {
  it('assumes a link was sent when the modal opens for an unconfirmed sign-in', () => {
    expect(verificationView(null)).toEqual({ body: 'sent', notice: null, showDetail: false });
  });

  it('after signing up, the main text alone describes the outcome', () => {
    expect(verificationView({ source: 'signup', result: { state: 'sent' } })).toEqual({ body: 'sent', notice: null, showDetail: false });
    expect(verificationView({ source: 'signup', result: { state: 'fallback-sent' } })).toEqual({ body: 'fallback-sent', notice: null, showDetail: false });
    expect(verificationView({ source: 'signup', result: { state: 'queued' } })).toEqual({ body: 'queued', notice: null, showDetail: false });
    expect(verificationView({ source: 'signup', result: { state: 'failed', detail: 'x' } })).toEqual({ body: 'failed', notice: null, showDetail: true });
  });

  it('asks to wait when signing up hit the request limit', () => {
    expect(verificationView({ source: 'signup', result: { state: 'failed', tooMany: true } }).notice).toBe('too-many');
  });

  it('after a resend, confirms success and explains failures under the button', () => {
    expect(verificationView({ source: 'resend', result: { state: 'sent' } }).notice).toBe('sent');
    expect(verificationView({ source: 'resend', result: { state: 'queued' } })).toEqual({ body: 'queued', notice: null, showDetail: false });
    expect(verificationView({ source: 'resend', result: { state: 'fallback-sent' } })).toEqual({ body: 'fallback-sent', notice: null, showDetail: false });
    expect(verificationView({ source: 'resend', result: { state: 'failed' } })).toEqual({ body: 'failed', notice: 'error', showDetail: false });
    expect(verificationView({ source: 'resend', result: { state: 'failed', tooMany: true, detail: 'd' } })).toEqual({ body: 'failed', notice: 'too-many', showDetail: true });
  });
});

describe('resend cooldown', () => {
  it('waits a minute after any attempt, five after hitting the request limit', () => {
    expect(verificationCooldownMs({ state: 'sent' })).toBe(RESEND_COOLDOWN_MS);
    expect(verificationCooldownMs({ state: 'queued' })).toBe(RESEND_COOLDOWN_MS);
    expect(verificationCooldownMs({ state: 'fallback-sent' })).toBe(RESEND_COOLDOWN_MS);
    expect(verificationCooldownMs({ state: 'failed' })).toBe(RESEND_COOLDOWN_MS);
    expect(verificationCooldownMs({ state: 'failed', tooMany: true })).toBe(TOO_MANY_COOLDOWN_MS);
  });

  it('counts down in minutes and seconds', () => {
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(59_001)).toBe('1:00');
    expect(formatCountdown(5_000)).toBe('0:05');
    expect(formatCountdown(-10)).toBe('0:00');
  });
});
