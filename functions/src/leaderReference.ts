// Detects a registration that nominates its own applicant as the reference
// church leader.
//
// The leader-review token is signed over centerLeaderEmail, which the applicant
// types into the registration form. Put your own address there and the approval
// link arrives in your inbox, so `leaderApproval === 'approved'` stops meaning
// that a reference church approved anything.
//
// This is a detection, not a cure. The real fix is to resolve the leader's
// address from the churches registry instead of accepting free text — which
// needs the registry to actually carry leader emails, and the form to select a
// church rather than take a typed name. Until then, catching the blatant case
// keeps the gate honest against the applicant themselves.

/**
 * Lowercases, trims, and drops a `+tag` from the local part, so
 * `Me+leader@example.com` still matches `me@example.com` — the obvious way to
 * point the approval link at your own inbox while looking like a third party.
 *
 * Provider-specific tricks beyond this (gmail's ignored dots, for instance)
 * are deliberately not modelled: over-normalising risks collapsing two genuinely
 * different people onto one address.
 */
export function normalizeEmailForComparison(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return trimmed;

  const plus = local.indexOf('+');
  const bareLocal = plus === -1 ? local : local.slice(0, plus);
  if (!bareLocal) return trimmed;

  return `${bareLocal}@${domain}`;
}

export function isSelfNominatedLeader(args: {
  leaderEmail: unknown;
  applicantEmails: readonly unknown[];
}): boolean {
  const leader = normalizeEmailForComparison(args.leaderEmail);
  if (!leader) return false;

  return args.applicantEmails.some(candidate => {
    const applicant = normalizeEmailForComparison(candidate);
    return applicant !== '' && applicant === leader;
  });
}
