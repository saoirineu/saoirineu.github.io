import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  fetchEuropeanGatheringLeaderView,
  submitEuropeanGatheringLeaderResponse,
  type EuropeanGatheringLeaderView,
  type LeaderApprovalDecision
} from '../lib/europeanGathering';

const attendanceModeLabels: Record<NonNullable<EuropeanGatheringLeaderView['attendanceMode']>, string> = {
  lodging: 'Lodging and meals',
  meals: 'Meals only',
  spiritual: 'Spiritual works only'
};

function formatDecision(decision: LeaderApprovalDecision | null) {
  if (decision === 'approved') return 'Approved';
  if (decision === 'rejected') return 'Rejected';
  return 'Pending';
}

function formatDateTime(value: number | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(value);
}

function decisionBadgeClasses(decision: LeaderApprovalDecision | null) {
  if (decision === 'approved') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (decision === 'rejected') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function LeaderReviewPage() {
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const id = params.id ?? '';
  const token = searchParams.get('t') ?? '';

  const [data, setData] = useState<EuropeanGatheringLeaderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<'comment' | 'approved' | 'rejected' | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!id || !token) {
      setLoading(false);
      setLoadError('Missing registration id or access token.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchEuropeanGatheringLeaderView({ id, token })
      .then(view => { if (!cancelled) setData(view); })
      .catch(error => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load registration.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, token]);

  const fullName = useMemo(() => {
    if (!data) return '';
    return `${data.firstName} ${data.lastName}`.trim();
  }, [data]);

  async function handleSubmit(args: { comment?: string; decision?: LeaderApprovalDecision }) {
    setSubmitError('');
    setFeedback('');
    setSubmitting(args.decision ?? 'comment');
    try {
      const next = await submitEuropeanGatheringLeaderResponse({ id, token, ...args });
      setData(next);
      if (args.comment) setComment('');
      setFeedback(args.decision
        ? `Response recorded: ${formatDecision(args.decision)}.`
        : 'Comment recorded.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit response.');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-sm text-slate-600">Loading registration...</div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {loadError || 'Registration not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Leader review</p>
        <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
        <p className="text-sm text-slate-600">{data.country} · {data.church}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Participation</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Mode</dt>
            <dd className="text-sm text-slate-800">{data.attendanceMode ? attendanceModeLabels[data.attendanceMode] : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Stay</dt>
            <dd className="text-sm text-slate-800">{data.checkIn ?? '—'} → {data.checkOut ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Selected works</dt>
            <dd className="text-sm text-slate-800">{data.selectedWorks.length ? data.selectedWorks.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Contribution</dt>
            <dd className="text-sm text-slate-800">{formatCurrency(data.contribution.total)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Status</dt>
            <dd className="text-sm text-slate-800">
              <span className="inline-flex">
                {data.isInitiated ? 'Initiated · ' : ''}
                {data.isIcefluMember ? 'ICEFLU member · ' : ''}
                {data.isNovice ? 'First time' : 'Returning'}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Your decision</h2>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${decisionBadgeClasses(data.leaderApproval)}`}>
            {formatDecision(data.leaderApproval)}
          </span>
        </div>
        {data.leaderApprovalRespondedAt ? (
          <p className="text-xs text-slate-500">Last decision recorded {formatDateTime(data.leaderApprovalRespondedAt)}.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            disabled={submitting !== null}
            onClick={() => handleSubmit({ decision: 'approved' })}
          >
            {submitting === 'approved' ? 'Approving…' : 'Approve'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            disabled={submitting !== null}
            onClick={() => handleSubmit({ decision: 'rejected' })}
          >
            {submitting === 'rejected' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Comments / observations</h2>
        <ul className="space-y-2">
          {(data.leaderComments ?? []).length === 0 ? (
            <li className="text-sm text-slate-500">No comments yet.</li>
          ) : (
            (data.leaderComments ?? []).map((entry, index) => (
              <li key={`${entry.at ?? index}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <div className="text-xs text-slate-500">{formatDateTime(entry.at)}</div>
                <div className="whitespace-pre-line">{entry.text}</div>
              </li>
            ))
          )}
        </ul>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600" htmlFor="leader-comment">Add a comment</label>
          <textarea
            id="leader-comment"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={comment}
            onChange={event => setComment(event.target.value)}
          />
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            disabled={submitting !== null || !comment.trim()}
            onClick={() => handleSubmit({ comment: comment.trim() })}
          >
            {submitting === 'comment' ? 'Saving…' : 'Add comment'}
          </button>
        </div>
      </section>

      {submitError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{submitError}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</div> : null}
    </div>
  );
}
