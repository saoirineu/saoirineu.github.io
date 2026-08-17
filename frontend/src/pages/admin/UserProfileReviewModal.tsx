import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { UserDocumentLink } from '../../components/UserDocumentLink';
import { fetchApprovedSnapshots, type ApprovedProfileSnapshot, type UserProfile } from '../../lib/users';
import type { SiteLocale } from '../../lib/siteLocale';
import { ProfileReadOnly } from '../profile/ProfileReadOnly';
import { ConsentsPanel } from './ConsentsPanel';
import { approvalStatusButtonClass, type ProfileLabels } from './userReview';

/**
 * The applicant review modal, shared by the user-administration table and the
 * ICEFLU membership review queue so both approve through exactly the same
 * screen. What the applicant submitted is shown as their own membership form,
 * locked (see ProfileReadOnly): every answer they gave, in the order they gave
 * it, rather than a summary that has to grow each time the form does.
 */
export function UserProfileReviewModal({
  user,
  labels,
  locale,
  statusLabel,
  isBusy,
  onApprove,
  onRevoke,
  onRequestReview,
  onSaveNote,
  onClose
}: {
  user: UserProfile;
  labels: ProfileLabels;
  locale: SiteLocale;
  statusLabel: string;
  isBusy: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  onRequestReview: (note: string) => void;
  onSaveNote: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(user.adminNote ?? '');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteRequiredError, setNoteRequiredError] = useState(false);

  const snapshotsQuery = useQuery({
    queryKey: ['approvedSnapshots', user.uid],
    queryFn: () => fetchApprovedSnapshots(user.uid),
  });

  const displayName =
    user.fullName ?? user.displayName ?? ([user.firstName, user.surname].filter(Boolean).join(' ') || '—');

  const submittedAt = user.approvalSubmittedAt
    ? new Date(user.approvalSubmittedAt.toMillis()).toLocaleString()
    : '—';

  const status = user.approvalStatus ?? 'needs-profile';

  function handleSaveNote() {
    setNoteSaved(false);
    onSaveNote(note);
    setNoteSaved(true);
  }

  function handleRequestReview() {
    if (!note.trim()) {
      setNoteRequiredError(true);
      return;
    }
    setNoteRequiredError(false);
    onRequestReview(note);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900">{labels.title}</h2>
              <span className={approvalStatusButtonClass(status) + ' pointer-events-none'}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{displayName}</span>
              {' · '}
              {labels.submittedAt}: {submittedAt}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
          >
            {labels.close}
          </button>
        </div>

        {/* The submitted membership form, exactly as filled in */}
        <div className="px-6 py-4">
          <ProfileReadOnly profile={user} locale={locale} noDocumentLabel={labels.noDocument} />
        </div>

        {/* Admin note */}
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600">{labels.adminNote}</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={note}
              onChange={e => { setNote(e.target.value); setNoteSaved(false); setNoteRequiredError(false); }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={isBusy}
                onClick={handleSaveNote}
              >
                {labels.saveNote}
              </button>
              {noteSaved ? <span className="text-xs text-emerald-700">{labels.noteSaved}</span> : null}
              {noteRequiredError ? <span className="text-xs text-red-600">{labels.noteRequired}</span> : null}
            </div>
          </div>
        </div>

        <ConsentsPanel uid={user.uid} locale={locale} />

        {/* Approved snapshot history */}
        <div className="border-t border-slate-100 px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.snapshotHistory}</h3>
          {snapshotsQuery.isLoading ? (
            <p className="text-xs text-slate-400">...</p>
          ) : snapshotsQuery.data && snapshotsQuery.data.length > 0 ? (
            <div className="space-y-4">
              {snapshotsQuery.data.map(snap => (
                <SnapshotCard key={snap.snapshotId} snapshot={snap} approvedOnLabel={labels.snapshotApprovedOn} noDocumentLabel={labels.noDocument} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">{labels.snapshotNone}</p>
          )}
        </div>

        {/* Action footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          {status === 'pending' ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                disabled={isBusy}
                onClick={handleRequestReview}
              >
                {labels.requestReview}
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                disabled={isBusy}
                onClick={onApprove}
              >
                {labels.approve}
              </button>
            </>
          ) : null}
          {status === 'approved' ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              disabled={isBusy}
              onClick={onRevoke}
            >
              {labels.revokeApproval}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ snapshot, approvedOnLabel, noDocumentLabel }: {
  snapshot: ApprovedProfileSnapshot;
  approvedOnLabel: string;
  noDocumentLabel: string;
}) {
  const approvedAt = new Date(snapshot.approvedAt.toMillis()).toLocaleString();
  const displayName = snapshot.fullName ?? snapshot.displayName ?? ([snapshot.firstName, snapshot.surname].filter(Boolean).join(' ') || '—');
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-800">{displayName}</span>
        <span className="text-xs text-slate-500">{approvedOnLabel}: {approvedAt}</span>
      </div>
      {snapshot.email ? <div className="text-xs text-slate-600">{snapshot.email}</div> : null}
      {snapshot.birthDate ? <div className="text-xs text-slate-600">{snapshot.birthDate}</div> : null}
      {snapshot.currentChurchName ? <div className="text-xs text-slate-600">{snapshot.currentChurchName}</div> : null}
      {snapshot.firstWorkDate ? <div className="text-xs text-slate-600">{snapshot.firstWorkDate}</div> : null}
      {snapshot.firstWorkChurchName ? <div className="text-xs text-slate-600">{snapshot.firstWorkChurchName}</div> : null}
      <div className="pt-1">
        <UserDocumentLink
          name={snapshot.identityDocumentPrimaryName}
          path={snapshot.identityDocumentPrimaryPath}
          fallback={noDocumentLabel}
        />
      </div>
    </div>
  );
}
