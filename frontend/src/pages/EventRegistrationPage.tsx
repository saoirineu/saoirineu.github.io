import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FileUploadField } from '../components/FileUploadField';
import { InfoTooltip } from '../components/InfoTooltip';
import { consentRequired, fetchUserConsents } from '../lib/consents';
import { fetchEvent, type EventLocale } from '../lib/events';
import {
  calculateEventCautionDeposit,
  calculateEventContribution,
  createEventRegistration,
  fetchEventCapacity,
  fetchMyEventRegistration,
  resolveEventDocumentUrl,
  totalEventCapacity,
  totalEventSlotsAvailable,
  updateMyEventRegistration,
  validateEventRegistration,
  type EventAttendanceMode,
  type EventRegistrationFormValues
} from '../lib/eventRegistrations';
import { uploadAccept } from '../lib/uploads';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';
import { registrationCopyByLocale } from './events/registrationCopy';

type DocumentState = { identityDocument: File | null; paymentProof: File | null; consentDocument: File | null };

const initialValues: EventRegistrationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: '',
  church: '',
  centerLeader: '',
  centerLeaderEmail: '',
  isInitiated: false,
  isIcefluMember: false,
  isNovice: false,
  attendanceMode: 'lodging',
  checkIn: '',
  checkOut: '',
  selectedWorks: [],
  needsExtraLinen: false
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function localized(text: Record<EventLocale, string>, locale: EventLocale) {
  return text[locale] || text.en || text.pt || text.es || text.it || '';
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-700">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm';

export default function EventRegistrationPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { locale } = useSiteLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const copy = registrationCopyByLocale[locale];

  const [values, setValues] = useState<EventRegistrationFormValues>(initialValues);
  const [documents, setDocuments] = useState<DocumentState>({ identityDocument: null, paymentProof: null, consentDocument: null });
  const [existingDocUrls, setExistingDocUrls] = useState<{ identityDocument?: string; paymentProof?: string; consentDocument?: string }>({});
  const [removedDocs, setRemovedDocs] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState('');
  const [successState, setSuccessState] = useState<{ registrationId: string; total: number } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const draftLoadedRef = useRef(false);
  const draftKey = `event-draft-${slug}`;

  const eventQuery = useQuery({ queryKey: ['event', slug], queryFn: () => fetchEvent(slug), enabled: !!slug });
  const event = eventQuery.data ?? null;

  const registrationQuery = useQuery({
    queryKey: ['myEventRegistration', slug, user?.uid],
    queryFn: () => fetchMyEventRegistration(slug, user!.uid),
    enabled: !!slug && !!user?.uid
  });
  const existing = registrationQuery.data ?? null;

  const capacityQuery = useQuery({
    queryKey: ['eventCapacity', slug],
    queryFn: () => fetchEventCapacity(event!),
    enabled: !!event
  });

  const consentsQuery = useQuery({
    queryKey: ['userConsents', user?.uid],
    queryFn: () => fetchUserConsents(user!.uid),
    enabled: !!user?.uid
  });

  const setField = <K extends keyof EventRegistrationFormValues>(key: K, value: EventRegistrationFormValues[K]) =>
    setValues(current => ({ ...current, [key]: value }));

  useEffect(() => {
    if (user?.email) setValues(prev => (prev.email ? prev : { ...prev, email: user.email! }));
  }, [user?.email]);

  useEffect(() => {
    if (!event || existing) return;
    setValues(prev => ({
      ...prev,
      checkIn: prev.checkIn || event.checkInSuggested || '',
      checkOut: prev.checkOut || event.checkOutSuggested || ''
    }));
  }, [event, existing]);

  // Load a saved draft once, when there is no existing registration.
  useEffect(() => {
    if (typeof window === 'undefined' || draftLoadedRef.current || !event || existing || registrationQuery.isPending) return;
    draftLoadedRef.current = true;
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<EventRegistrationFormValues>;
      setValues(current => ({ ...current, ...draft }));
      setDraftMessage(copy.draftLoaded);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [event, existing, registrationQuery.isPending, draftKey, copy.draftLoaded]);

  const saveDraft = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(draftKey, JSON.stringify(values));
    setDraftMessage(copy.draftSaved);
  };

  useEffect(() => {
    if (!existing) return;
    setValues({
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email ?? '',
      phone: existing.phone ?? '',
      country: existing.country,
      church: existing.church,
      centerLeader: existing.centerLeader,
      centerLeaderEmail: existing.centerLeaderEmail ?? '',
      isInitiated: existing.isInitiated,
      isIcefluMember: existing.isIcefluMember,
      isNovice: existing.isNovice,
      attendanceMode: existing.attendanceMode,
      checkIn: existing.checkIn ?? '',
      checkOut: existing.checkOut ?? '',
      selectedWorks: existing.selectedWorks,
      needsExtraLinen: existing.needsExtraLinen
    });
    setRemovedDocs(new Set());
    const paths = { identityDocument: existing.identityDocumentPath, paymentProof: existing.paymentProofPath, consentDocument: existing.consentDocumentPath };
    const entries = Object.entries(paths).filter((e): e is [string, string] => !!e[1]);
    Promise.all(
      entries.map(async ([key, path]) => {
        try {
          return [key, await resolveEventDocumentUrl(path)] as const;
        } catch {
          return null;
        }
      })
    ).then(results => setExistingDocUrls(Object.fromEntries(results.filter((r): r is readonly [string, string] => r !== null))));
  }, [existing]);

  const contribution = useMemo(() => (event ? calculateEventContribution(event, values) : null), [event, values]);
  const consentNeeded = values.isNovice || consentRequired(consentsQuery.data ?? []);
  const capacity = capacityQuery.data ?? (event ? [{ id: 'total', capacity: totalEventCapacity(event), reserved: 0, available: totalEventCapacity(event) }] : []);
  const slotsAvailable = totalEventSlotsAvailable(capacity);
  const slotCapacity = event ? totalEventCapacity(event) : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error(copy.notFound);
      const keptIdentity = !removedDocs.has('identityDocument') ? existing?.identityDocumentPath : undefined;
      const keptPayment = !removedDocs.has('paymentProof') ? existing?.paymentProofPath : undefined;
      const keptConsent = !removedDocs.has('consentDocument') ? existing?.consentDocumentPath : undefined;

      const validation = validateEventRegistration(values, documents, {
        identityDocumentPath: keptIdentity,
        paymentProofPath: keptPayment,
        consentDocumentPath: keptConsent
      }, consentNeeded);
      if (validation) throw new Error(copy.errors[validation]);

      const input = {
        locale,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        country: values.country.trim(),
        church: values.church.trim(),
        centerLeader: values.centerLeader.trim(),
        centerLeaderEmail: values.centerLeaderEmail.trim() || undefined,
        isInitiated: values.isInitiated,
        isIcefluMember: values.isIcefluMember,
        isNovice: values.isNovice,
        attendanceMode: values.attendanceMode,
        checkIn: values.attendanceMode === 'spiritual' ? undefined : values.checkIn || undefined,
        checkOut: values.attendanceMode === 'spiritual' ? undefined : values.checkOut || undefined,
        selectedWorks: values.selectedWorks,
        needsExtraLinen: values.attendanceMode === 'lodging' ? values.needsExtraLinen : false,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        contribution: contribution!,
        identityDocumentName: keptIdentity ? existing?.identityDocumentName : undefined,
        identityDocumentPath: keptIdentity,
        paymentProofName: keptPayment ? existing?.paymentProofName : undefined,
        paymentProofPath: keptPayment,
        consentDocumentName: keptConsent ? existing?.consentDocumentName : undefined,
        consentDocumentPath: keptConsent
      };

      if (existing) {
        await updateMyEventRegistration({ event, id: existing.id, input, userId: user?.uid, documents });
        return { registrationId: existing.id, total: contribution!.total };
      }
      const ref = await createEventRegistration({ event, input: { ...input, status: 'pending' }, userId: user?.uid, documents });
      return { registrationId: ref.id, total: contribution!.total };
    },
    onSuccess: data => {
      if (typeof window !== 'undefined') window.localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ['myEventRegistration', slug, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['eventCapacity', slug] });
      queryClient.invalidateQueries({ queryKey: ['userConsents', user?.uid] });
      setSuccessState(data);
    },
    onError: error => setSubmitError(error instanceof Error ? error.message : 'Error')
  });

  const toggleWork = (id: string) =>
    setValues(current => ({
      ...current,
      selectedWorks: current.selectedWorks.includes(id) ? current.selectedWorks.filter(w => w !== id) : [...current.selectedWorks, id]
    }));

  if (eventQuery.isLoading) return <div className="text-sm text-slate-600">…</div>;
  if (!event) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{copy.notFound}</div>;
  if (event.status !== 'published') return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{copy.closed}</div>;

  if (successState) {
    const deposit = calculateEventCautionDeposit(event, successState.total);
    return (
      <div className="mx-auto max-w-2xl">
        <section className="space-y-4 rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">OK</p>
          <h2 className="text-2xl font-semibold text-slate-900">{copy.successTitle}</h2>
          <p className="text-sm leading-6 text-slate-600">{copy.successIntro}</p>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{copy.registrationId}</div>
            <div className="mt-1 break-all">{successState.registrationId}</div>
          </div>
          <div className="rounded-[24px] bg-slate-950 p-6 text-slate-50">
            <h3 className="text-lg font-semibold">{copy.paymentInfoButton}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {event.payment.beneficiary ? <div><dt className="text-slate-400">{copy.paymentBeneficiary}</dt><dd className="mt-1 font-medium text-white">{event.payment.beneficiary}</dd></div> : null}
              {event.payment.iban ? <div><dt className="text-slate-400">IBAN</dt><dd className="mt-1 font-mono font-medium text-white">{event.payment.iban}</dd></div> : null}
              {event.payment.swift ? <div><dt className="text-slate-400">SWIFT</dt><dd className="mt-1 font-mono font-medium text-white">{event.payment.swift}</dd></div> : null}
              {event.payment.causale ? <div><dt className="text-slate-400">{copy.paymentCausale}</dt><dd className="mt-1 font-medium text-white">{event.payment.causale}</dd></div> : null}
              <div><dt className="text-slate-400">{copy.total}</dt><dd className="mt-1 text-xl font-semibold text-amber-300">{formatCurrency(successState.total)}</dd></div>
              <div><dt className="text-slate-400">{copy.cautionDeposit} ({Math.round(event.cautionDepositRate * 100)}%)</dt><dd className="mt-1 font-medium text-amber-200">{formatCurrency(deposit)}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-300">{copy.paymentNote}</p>
          </div>
          <button type="button" onClick={() => navigate('/')} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">{copy.backHome}</button>
        </section>
      </div>
    );
  }

  const fileProps = (key: keyof DocumentState, label: ReactNode) => ({
    accept: uploadAccept,
    className: 'flex h-full flex-col',
    closeLabel: copy.close,
    compressedSizeLabel: copy.fileCompressedSize,
    compressionBody: copy.fileCompressionBody,
    compressionError: copy.fileCompressionError,
    compressionTitle: copy.fileCompressionTitle,
    downloadLabel: copy.fileDownload,
    file: documents[key],
    existingStoredFile: !documents[key] && existing?.[`${key}Path` as const] && !removedDocs.has(key) && existingDocUrls[key]
      ? { name: existing[`${key}Name` as const] ?? existingDocUrls[key]!, url: existingDocUrls[key]! }
      : null,
    onRemoveExisting: () => setRemovedDocs(prev => new Set([...prev, key])),
    invalidTypeError: copy.fileInvalidType,
    keepOriginalLabel: copy.fileKeepOriginal,
    label,
    labelClassName: 'leading-5',
    openInNewTabLabel: copy.fileOpenNewTab,
    onChange: (file: File | null) => setDocuments(current => ({ ...current, [key]: file })),
    originalSizeLabel: copy.fileOriginalSize,
    previewLabel: copy.filePreview,
    previewTitle: copy.filePreviewTitle,
    processingLabel: copy.fileProcessing,
    removeLabel: copy.fileRemove,
    selectLabel: copy.fileSelect,
    tooLargeError: copy.fileTooLarge,
    useCompressedLabel: copy.fileApproveCompressed
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{localized(event.title, locale)}</h1>
        <p className="text-sm text-slate-600">{copy.loggedIntro}</p>
      </header>

      <form
        className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]"
        onSubmit={e => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <section className="space-y-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.personalTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={copy.firstName}><input className={inputClass} value={values.firstName} onChange={e => setField('firstName', e.target.value)} /></Field>
              <Field label={copy.lastName}><input className={inputClass} value={values.lastName} onChange={e => setField('lastName', e.target.value)} /></Field>
              <Field label={copy.email}><input type="email" className={inputClass} value={values.email} onChange={e => setField('email', e.target.value)} /></Field>
              <Field label={copy.phone}><input type="tel" className={inputClass} value={values.phone} onChange={e => setField('phone', e.target.value)} /></Field>
              <Field label={copy.country}><input className={inputClass} value={values.country} onChange={e => setField('country', e.target.value)} /></Field>
              <Field label={copy.church}><input className={inputClass} value={values.church} onChange={e => setField('church', e.target.value)} /></Field>
              <Field label={copy.centerLeader}><input className={inputClass} value={values.centerLeader} onChange={e => setField('centerLeader', e.target.value)} /></Field>
              <Field label={<span className="inline-flex items-center gap-2"><span>{copy.centerLeaderEmail}</span><InfoTooltip compact body={copy.centerLeaderEmailInfo} title={copy.centerLeaderEmail} /></span>}>
                <input type="email" className={inputClass} value={values.centerLeaderEmail} onChange={e => setField('centerLeaderEmail', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.statusTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {([['isInitiated', copy.initiated], ['isIcefluMember', copy.icefluMember], ['isNovice', copy.novice]] as const).map(([field, label]) => {
                const disabled = field === 'isNovice' && values.isInitiated;
                const checked = !disabled && values[field];
                return (
                  <label key={field} className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${disabled ? 'border-slate-100 bg-slate-50/50 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <span>{label}</span>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => { const next = !values[field]; setField(field, next); if (field === 'isInitiated' && next) setField('isNovice', false); }} />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.participationTitle}</h2>
            <Field label={copy.attendanceMode}>
              <select className={inputClass} value={values.attendanceMode} onChange={e => setField('attendanceMode', e.target.value as EventAttendanceMode)}>
                <option value="lodging">{copy.modeLodging}</option>
                <option value="meals">{copy.modeMeals}</option>
                <option value="spiritual">{copy.modeSpiritual}</option>
              </select>
            </Field>

            <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${slotsAvailable > 0 ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
              <span className="font-medium">{copy.slotsAvailableLabel}</span>
              <span className="font-semibold">{slotsAvailable} / {slotCapacity}</span>
            </div>

            {values.attendanceMode !== 'spiritual' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.checkIn}><input type="date" className={inputClass} value={values.checkIn} onChange={e => setField('checkIn', e.target.value)} /></Field>
                <Field label={copy.checkOut}><input type="date" className={inputClass} value={values.checkOut} onChange={e => setField('checkOut', e.target.value)} /></Field>
              </div>
            ) : null}

            {values.attendanceMode === 'lodging' ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs leading-5 text-slate-500">{copy.bedNote}</p>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={values.needsExtraLinen} onChange={e => setField('needsExtraLinen', e.target.checked)} />
                  {copy.extraLinen} (+{formatCurrency(event.pricing.extraLinen)})
                </label>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.worksTitle}</h2>
            <p className="text-sm text-slate-600">{copy.worksHint}</p>
            <div className="grid gap-3">
              {event.works.map(work => (
                <label key={work.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={values.selectedWorks.includes(work.id)} onChange={() => toggleWork(work.id)} />
                  {localized(work.label, locale) || new Date(work.dateTime).toLocaleString()}
                </label>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{copy.resourcesTitle}</h2>
            <div className="mt-4 grid gap-2">
              {event.resources?.programUrl ? (
                <a className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" href={localized(event.resources.programUrl, locale)} target="_blank" rel="noreferrer">{copy.generalProgram}</a>
              ) : null}
              {event.resources?.directionsUrl ? (
                <a className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" href={localized(event.resources.directionsUrl, locale)} target="_blank" rel="noreferrer">{copy.directions}</a>
              ) : null}
              <div className="flex items-center gap-2">
                <button type="button" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50" onClick={() => setIsPaymentModalOpen(true)}>{copy.paymentInfoButton}</button>
                <InfoTooltip body={copy.paymentTooltip} title={copy.paymentInfoButton} />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{copy.documentsTitle}</h2>
              <InfoTooltip body={copy.fileInfoBody} title={copy.fileInfoTitle} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FileUploadField {...fileProps('identityDocument', copy.identityDocument)} />
              <FileUploadField {...fileProps('paymentProof', <span className="inline-flex items-center gap-2"><span>{copy.paymentProof}</span><InfoTooltip compact body={copy.paymentTooltip} title={copy.paymentProof} /></span>)} />
              {consentNeeded ? (
                <div className="sm:col-span-2 space-y-2">
                  <FileUploadField {...fileProps('consentDocument', copy.consentDocument)} />
                  <p className="text-xs leading-5 text-amber-800">
                    {copy.consentNote}
                    {event.resources?.consentFormUrl ? (
                      <>
                        {' '}
                        <a className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800" href={localized(event.resources.consentFormUrl, locale)} target="_blank" rel="noreferrer">{copy.consentDownload}</a>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{copy.contributionTitle}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {[[copy.nights, String(contribution!.nights)], [copy.lodging, formatCurrency(contribution!.lodging)], [copy.spiritualWorks, formatCurrency(contribution!.spiritualWorks)], [copy.extras, formatCurrency(contribution!.extras)]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-4 text-white">
                <dt className="font-medium">{copy.total}</dt>
                <dd className="text-xl font-semibold text-amber-300">{formatCurrency(contribution!.total)}</dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="flex items-center gap-2 text-slate-600">
                  <span>{copy.cautionDeposit} ({Math.round(event.cautionDepositRate * 100)}%)</span>
                  <InfoTooltip compact body={copy.paymentTooltip} title={copy.cautionDeposit} />
                </dt>
                <dd className="font-semibold text-slate-900">{formatCurrency(calculateEventCautionDeposit(event, contribution!.total))}</dd>
              </div>
            </dl>
          </section>

          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">{copy.privacyConsent}</p>
          {draftMessage ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{draftMessage}</p> : null}
          {submitError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {!existing ? (
              <button type="button" onClick={saveDraft} className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{copy.saveDraft}</button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <button type="submit" disabled={mutation.isPending} className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
              {mutation.isPending ? copy.submitting : existing ? copy.update : copy.submit}
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">{copy.contactInfo}</p>
        </aside>
      </form>

      {isPaymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4" role="dialog" aria-modal="true" aria-label={copy.paymentInfoButton}>
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">{copy.paymentInfoButton}</h2>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">{copy.close}</button>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              {event.payment.beneficiary ? <div className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">{copy.paymentBeneficiary}</dt><dd className="mt-1 font-semibold text-slate-900">{event.payment.beneficiary}</dd></div> : null}
              {event.payment.causale ? <div className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">{copy.paymentCausale}</dt><dd className="mt-1 font-semibold text-slate-900">{event.payment.causale}</dd></div> : null}
              {event.payment.iban ? <div className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">IBAN</dt><dd className="mt-1 font-mono font-semibold tracking-wide text-slate-900">{event.payment.iban}</dd></div> : null}
              {event.payment.swift ? <div className="rounded-2xl bg-slate-50 px-4 py-3"><dt className="text-xs font-medium text-slate-500">SWIFT</dt><dd className="mt-1 font-mono font-semibold tracking-wide text-slate-900">{event.payment.swift}</dd></div> : null}
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-500">{copy.paymentNote}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
