import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import { ensureItalianReferenceChurches, fetchChurches } from '../lib/works';
import { fetchMembersByEmail, type MemberRecord } from '../lib/members';
import { fetchUser, fetchApprovedSnapshots, fetchInitiatorNames, resolveUserDocumentUrl, uploadUserIdentityDocument, upsertUser } from '../lib/users';
import { uploadAccept } from '../lib/uploads';
import { getFileUploadLabels } from '../lib/fileUploadLabels';
import { FileUploadField } from '../components/FileUploadField';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { formatFullName } from './members/form';
import { AddChurchModal, type AddChurchModalState } from './sacrament/SacramentSections';
import { churchFormCopyByLocale, requiredChurchNameByLocale } from './sacrament/copy';
import { profileCopyByLocale, profileSectionsCopy } from './profile/copy';
import {
  applyAuthFallback,
  applyMemberPrefill,
  buildProfileForm,
  buildUserPayload,
  initialProfileForm,
  isProfileFormReadyForApproval,
  type ProfileFormState
} from './profile/form';
import {
  ProfileConsentsSection,
  ProfileIdentitySection,
  ProfileNationalityDeclaration,
  ProfileNotesSection,
  ProfilePersonalSection,
  ProfileInitiationSection,
  ProfileChurchesSection,
  ProfileResidenceSection,
  ProfileRolesSection
} from './profile/ProfileSections';

type ProfileSaveMode = 'save' | 'submit';

export default function ProfilePage() {
  const { user } = useAuth();
  const { locale } = useSiteLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const copy = { ...profileCopyByLocale[locale], sections: profileSectionsCopy(locale) };
  const uploadLabels = getFileUploadLabels(locale);

  const [form, setForm] = useState<ProfileFormState>(initialProfileForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [identityDocumentFile, setIdentityDocumentFile] = useState<File | null>(null);
  const [identitySecondaryDocumentFile, setIdentitySecondaryDocumentFile] = useState<File | null>(null);
  const [addChurchModal, setAddChurchModal] = useState<AddChurchModalState | null>(null);

  const churchesQuery = useQuery({ queryKey: ['churches'], queryFn: fetchChurches });
  const profileQuery = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetchUser(user!.uid),
    enabled: !!user
  });
  const memberMatchesQuery = useQuery({
    queryKey: ['memberMatches', user?.email],
    queryFn: async (): Promise<MemberRecord[]> => {
      try {
        return await fetchMembersByEmail(user!.email!);
      } catch {
        return []; // prefill is an enhancement; never block the profile on it
      }
    },
    enabled: !!user?.email
  });

  const memberMatches = useMemo(() => memberMatchesQuery.data ?? [], [memberMatchesQuery.data]);
  // The member this user declared to be: an in-session choice wins, then the
  // saved link; with a single email match the link is automatic. With several
  // matches (family email) nothing is prefilled until the user picks one.
  const [declaredMemberId, setDeclaredMemberId] = useState('');
  const linkedMember = useMemo(() => {
    const chosenId = declaredMemberId || profileQuery.data?.memberId;
    const chosen = chosenId ? memberMatches.find(member => member.id === chosenId) ?? null : null;
    if (chosen) return chosen;
    return memberMatches.length === 1 ? memberMatches[0] : null;
  }, [declaredMemberId, memberMatches, profileQuery.data?.memberId]);

  // The saved profile rebuilt as a form: the baseline the editable form starts
  // from, and what "unsaved edits" are measured against (re-submit button).
  const baselineForm = useMemo(() => {
    if (!user) return initialProfileForm;
    let next = buildProfileForm(user, profileQuery.data);
    if (linkedMember) next = applyMemberPrefill(next, linkedMember);
    return applyAuthFallback(next, user);
  }, [profileQuery.data, user, linkedMember]);

  useEffect(() => {
    if (!user) return;
    setForm(baselineForm);
  }, [baselineForm, user]);

  useEffect(() => {
    if (!user) return;
    ensureItalianReferenceChurches()
      .then(() => qc.invalidateQueries({ queryKey: ['churches'] }))
      .catch(() => undefined);
  }, [qc, user]);

  const setField = <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const canSubmitForApproval = isProfileFormReadyForApproval(form, !!identityDocumentFile);
  const isPending = profileQuery.data?.approvalStatus === 'pending';
  const isNeedsInfo = profileQuery.data?.approvalStatus === 'needs-info';
  const isApproved = profileQuery.data?.approvalStatus === 'approved';
  const adminNote = profileQuery.data?.adminNote;
  // Approved profiles stay frozen until the user deliberately re-submits, which
  // only makes sense once they have edits not yet reviewed.
  const hasUnsavedEdits = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baselineForm),
    [form, baselineForm]
  );

  const snapshotsQuery = useQuery({
    queryKey: ['approvedSnapshots', user?.uid],
    queryFn: () => fetchApprovedSnapshots(user!.uid),
    enabled: !!user,
  });

  const initiatorNamesQuery = useQuery({
    queryKey: ['initiatorNames'],
    queryFn: fetchInitiatorNames,
    enabled: !!user && form.isInitiated,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (mode: ProfileSaveMode) => {
      if (!user) throw new Error(copy.sessionExpired);
      setErrorMsg('');
      setSuccessMessage('');

      let nextForm = form;
      if (identityDocumentFile) {
        const uploadedDocument = await uploadUserIdentityDocument(user.uid, identityDocumentFile);
        nextForm = {
          ...nextForm,
          identityDocumentPrimaryName: uploadedDocument.name,
          identityDocumentPrimaryPath: uploadedDocument.path
        };
      }
      if (identitySecondaryDocumentFile) {
        const uploadedSecondary = await uploadUserIdentityDocument(user.uid, identitySecondaryDocumentFile);
        nextForm = {
          ...nextForm,
          identityDocumentSecondaryName: uploadedSecondary.name,
          identityDocumentSecondaryPath: uploadedSecondary.path
        };
      }

      const payload = buildUserPayload(user, nextForm);
      if (mode === 'save') {
        return upsertUser(user.uid, payload);
      }

      if (!isProfileFormReadyForApproval(nextForm)) {
        throw new Error(copy.requiredFieldsMissing);
      }

      // A deliberate submit always (re)requests review — including from an
      // already-approved profile, whose last approved snapshot stays frozen as
      // the historical record while this live version goes back to pending.
      return upsertUser(user.uid, {
        ...payload,
        approvalStatus: 'pending',
        approvalSubmittedAt: Timestamp.now()
      });
    },
    onSuccess: (_data, mode) => {
      qc.invalidateQueries({ queryKey: ['user', user?.uid] });
      setIdentityDocumentFile(null);
      setIdentitySecondaryDocumentFile(null);
      if (mode === 'submit') {
        navigate('/');
        return;
      }
      setSuccessMessage(copy.saved);
    },
    onError: err => {
      const msg = err instanceof Error ? err.message : copy.saveError;
      setErrorMsg(msg);
    }
  });

  const avatar = useMemo(() => {
    if (form.avatarUrl) return form.avatarUrl;
    if (user?.photoURL) return user.photoURL;
    return '';
  }, [form.avatarUrl, user?.photoURL]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
        <p className="text-sm text-slate-600">{copy.intro}</p>
      </div>

      {memberMatches.length > 1 ? (
        <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-sky-900">{copy.familyEmailTitle}</h2>
            <p className="text-sm text-sky-800">{copy.familyEmailIntro}</p>
          </div>
          <ul className="space-y-2">
            {memberMatches.map(candidate => (
              <li
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2"
              >
                <div className="text-sm text-slate-800">
                  <div className="font-medium">{formatFullName(candidate) || candidate.id}</div>
                  <div className="text-xs text-slate-500">
                    {[candidate.birthDate, candidate.city].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {linkedMember?.id === candidate.id ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {copy.sections.memberLinked}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                    onClick={() => setDeclaredMemberId(candidate.id)}
                  >
                    {copy.thisIsMe}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {linkedMember ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {copy.prefilledFrom(formatFullName(linkedMember) || linkedMember.id)}
        </div>
      ) : null}

      {snapshotsQuery.data && snapshotsQuery.data.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-900">{copy.snapshotSectionTitle}</h2>
          {snapshotsQuery.data.map(snap => {
            const approvedAt = new Date(snap.approvedAt.toMillis()).toLocaleDateString();
            const displayName = snap.fullName ?? snap.displayName ?? ([snap.firstName, snap.surname].filter(Boolean).join(' ') || '—');
            return (
              <div key={snap.snapshotId} className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">{displayName}</span>
                  <span className="text-xs text-emerald-700">{copy.snapshotApprovedOn}: {approvedAt}</span>
                </div>
                {snap.email ? <div className="text-xs text-slate-600">{snap.email}</div> : null}
                {snap.currentChurchName ? <div className="text-xs text-slate-600">{snap.currentChurchName}</div> : null}
                {snap.firstWorkDate ? <div className="text-xs text-slate-600">{copy.sections.firstWorkDate}: {snap.firstWorkDate}</div> : null}
                {snap.firstWorkChurchName ? <div className="text-xs text-slate-600">{snap.firstWorkChurchName}</div> : null}
                {snap.identityDocumentPrimaryPath ? (
                  <ProfileSnapshotDocumentLink name={snap.identityDocumentPrimaryName} path={snap.identityDocumentPrimaryPath} />
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {isPending ? (
        <section className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">{copy.pendingBannerTitle}</h2>
          <p className="text-sm text-amber-800">{copy.pendingBannerDesc}</p>
        </section>
      ) : null}

      {isNeedsInfo && adminNote ? (
        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-sm font-semibold text-orange-900">{copy.reviewBannerTitle}</h2>
          <p className="text-sm text-orange-800">{copy.reviewBannerDesc}</p>
          <blockquote className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800">
            <span className="mb-1 block text-xs font-semibold text-orange-700">{copy.adminNoteLabel}</span>
            {adminNote}
          </blockquote>
        </section>
      ) : null}

      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={e => {
          e.preventDefault();
          if (!isPending) mutation.mutate('save');
        }}
      >
        <fieldset disabled={isPending} className="space-y-4 border-0 p-0 m-0 min-w-0">
          <ProfileNationalityDeclaration copy={copy.sections} form={form} setField={setField} />

          <ProfilePersonalSection
            avatarUrl={avatar}
            copy={copy.sections}
            form={form}
            setField={setField}
            userPhotoURL={user.photoURL}
          />

          <ProfileIdentitySection copy={copy.sections} form={form} locale={locale} setField={setField} />

          <ProfileResidenceSection copy={copy.sections} form={form} locale={locale} setField={setField} />

          <section className="space-y-3 rounded-lg bg-slate-100 p-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {copy.idUploadTitle}
                <span className="text-red-500"> *</span>
              </h2>
              <p className="mt-1 text-xs text-slate-600">{copy.idUploadIntro}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                {form.identityDocumentPrimaryName && !identityDocumentFile ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{copy.idUploadCurrent}:</span> {form.identityDocumentPrimaryName}
                  </p>
                ) : null}
                <FileUploadField
                  accept={uploadAccept}
                  file={identityDocumentFile}
                  label={<>{copy.sections.identityDocumentPrimary}<span className="text-red-500"> *</span></>}
                  onChange={setIdentityDocumentFile}
                  {...uploadLabels}
                />
              </div>
              <div className="space-y-2">
                {form.identityDocumentSecondaryName && !identitySecondaryDocumentFile ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{copy.idUploadCurrent}:</span> {form.identityDocumentSecondaryName}
                  </p>
                ) : null}
                <FileUploadField
                  accept={uploadAccept}
                  file={identitySecondaryDocumentFile}
                  label={copy.sections.identityDocumentSecondary}
                  onChange={setIdentitySecondaryDocumentFile}
                  {...uploadLabels}
                />
              </div>
            </div>
          </section>

          <ProfileConsentsSection copy={copy.sections} form={form} setField={setField} />

          <ProfileNotesSection copy={copy.sections} form={form} setField={setField} />

          <ProfileChurchesSection
            copy={copy.sections}
            form={form}
            churches={churchesQuery.data}
            onRequestCreateChurch={onCreated => setAddChurchModal({ onCreated })}
            setField={setField}
          />

          <ProfileInitiationSection
            copy={copy.sections}
            form={form}
            churches={churchesQuery.data}
            initiatorNames={initiatorNamesQuery.data}
            onRequestCreateChurch={onCreated => setAddChurchModal({ onCreated })}
            setField={setField}
          />

          <ProfileRolesSection copy={copy.sections} form={form} setField={setField} />
        </fieldset>

        {!isPending ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {mutation.isPending && mutation.variables === 'save' ? copy.saving : copy.save}
            </button>
            {!isApproved || hasUnsavedEdits ? (
              <button
                type="button"
                disabled={mutation.isPending || !canSubmitForApproval}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => mutation.mutate('submit')}
              >
                {mutation.isPending && mutation.variables === 'submit' ? copy.submittingForApproval : copy.submitForApproval}
              </button>
            ) : null}
            {mutation.isError ? <span className="text-sm text-red-600">{copy.saveError}.</span> : null}
            {successMessage ? <span className="text-sm text-green-700">{successMessage}</span> : null}
            {errorMsg ? <span className="text-sm text-red-600">{errorMsg}</span> : null}
          </div>
        ) : null}
      </form>
      {addChurchModal ? (
        <AddChurchModal
          copy={churchFormCopyByLocale[locale]}
          loginToCreate={churchFormCopyByLocale[locale].loginToSave}
          onClose={() => setAddChurchModal(null)}
          onCreated={addChurchModal.onCreated}
          requiredName={requiredChurchNameByLocale[locale]}
          userPresent={!!user}
        />
      ) : null}
    </div>
  );
}

function ProfileSnapshotDocumentLink({ name, path }: { name?: string; path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
      onClick={async event => {
        if (url || loading) return;
        event.preventDefault();
        setLoading(true);
        try {
          const resolved = await resolveUserDocumentUrl(path);
          setUrl(resolved);
          window.open(resolved, '_blank', 'noopener,noreferrer');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? '...' : (name ?? path.split('/').pop())}
    </a>
  );
}
