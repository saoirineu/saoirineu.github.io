// Fixed-window send allowance for the portal's outbound mail.
//
// The relay on santodaime.it caps at 120 messages per hour GLOBALLY, so any
// loop that makes the portal send mail does not merely spam one inbox — it
// exhausts the budget and every legitimate message (signup verification,
// approval, needs-info) fails 429 for the rest of the hour. These caps sit in
// front of the send paths a signed-in person can trigger repeatedly.
//
// Pure so the window arithmetic is testable without a Firestore harness.

export type ThrottleState = { windowStart: number; count: number };

export type ThrottleDecision = {
  allowed: boolean;
  next: ThrottleState;
  /** Remaining sends in the current window after this decision. */
  remaining: number;
};

export function evaluateThrottle(args: {
  now: number;
  windowMs: number;
  maxInWindow: number;
  state?: ThrottleState | null;
}): ThrottleDecision {
  const { now, windowMs, maxInWindow } = args;
  const state = args.state;

  const withinWindow =
    !!state &&
    Number.isFinite(state.windowStart) &&
    Number.isFinite(state.count) &&
    // A window stamped in the future is a clock problem or a forged document;
    // treat it as stale rather than letting it block sends indefinitely.
    state.windowStart <= now &&
    now - state.windowStart < windowMs;

  if (!withinWindow) {
    return { allowed: true, next: { windowStart: now, count: 1 }, remaining: maxInWindow - 1 };
  }

  const count = Math.max(0, state!.count);
  if (count >= maxInWindow) {
    return { allowed: false, next: { windowStart: state!.windowStart, count }, remaining: 0 };
  }

  return {
    allowed: true,
    next: { windowStart: state!.windowStart, count: count + 1 },
    remaining: maxInWindow - (count + 1)
  };
}
