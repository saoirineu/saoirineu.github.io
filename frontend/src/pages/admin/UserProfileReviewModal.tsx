import type { ReactNode } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchApprovedSnapshots, resolveUserDocumentUrl, type ApprovedProfileSnapshot, type UserProfile } from '../../lib/users';
import type { SiteLocale } from '../../lib/siteLocale';
import { ConsentsPanel } from './ConsentsPanel';

/**
 * The applicant review modal and the field labels it renders, shared by the
 * user-administration table and the ICEFLU membership review queue so both
 * approve through exactly the same screen.
 */
export type ProfileLabels = Record<string, string>;

export const profileLabelsByLocale: Record<SiteLocale, ProfileLabels> = {
  pt: {
    title: 'Perfil do candidato',
    submittedAt: 'Enviado em',
    name: 'Nome completo',
    email: 'Email de login',
    email2: 'Email secundário',
    preferredCommunicationEmail: 'Email preferido',
    preferredLoginEmail: 'Email de login',
    preferredSecondaryEmail: 'Email secundário',
    phone: 'Telefone',
    mobile: 'Celular',
    fiscalCode: 'Código fiscal',
    idType: 'Tipo de documento',
    idTypePassport: 'Passaporte',
    idTypeIdCard: 'Documento de identidade',
    sex: 'Sexo atribuído ao nascer',
    birthDate: 'Data de nascimento',
    birthPlace: 'Local de nascimento',
    birthCountry: 'País de nascimento',
    citizenship: 'Cidadania',
    nationality: 'Nacionalidade',
    address: 'Endereço',
    city: 'Cidade',
    country: 'País',
    currentChurch: 'Igreja atual',
    originChurch: 'Igreja de origem',
    firstWorkParticipation: 'Participou de trabalho de Santo Daime',
    firstWorkDate: 'Data do primeiro trabalho',
    firstWorkChurch: 'Igreja do primeiro trabalho',
    isInitiated: 'Iniciado',
    initiationDate: 'Data de iniciação',
    initiatorName: 'Nome do iniciador',
    idDocPrimary: 'Documento de identidade',
    yes: 'Sim',
    no: 'Não',
    close: 'Fechar',
    noDocument: 'Nenhum arquivo enviado',
    approve: 'Aprovar membro',
    revokeApproval: 'Cancelar aprovação',
    requestReview: 'Solicitar revisão',
    noteRequired: 'Adicione uma nota antes de solicitar revisão.',
    adminNote: 'Nota administrativa',
    saveNote: 'Salvar nota',
    noteSaved: 'Nota salva.',
    actionError: 'Erro ao executar ação',
    snapshotHistory: 'Histórico de perfis aprovados',
    snapshotApprovedOn: 'Aprovado em',
    snapshotNone: 'Nenhum perfil aprovado registrado.'
  },
  en: {
    title: 'Applicant profile',
    submittedAt: 'Submitted at',
    name: 'Full name',
    email: 'Login email',
    email2: 'Secondary email',
    preferredCommunicationEmail: 'Preferred email',
    preferredLoginEmail: 'Login email',
    preferredSecondaryEmail: 'Secondary email',
    phone: 'Phone',
    mobile: 'Mobile',
    fiscalCode: 'Fiscal code',
    idType: 'ID type',
    idTypePassport: 'Passport',
    idTypeIdCard: 'ID card',
    sex: 'Sex assigned at birth',
    birthDate: 'Date of birth',
    birthPlace: 'Place of birth',
    birthCountry: 'Country of birth',
    citizenship: 'Citizenship',
    nationality: 'Nationality',
    address: 'Address',
    city: 'City',
    country: 'Country',
    currentChurch: 'Current church',
    originChurch: 'Church of origin',
    firstWorkParticipation: 'Attended Santo Daime work',
    firstWorkDate: 'First Work date',
    firstWorkChurch: 'First Work church',
    isInitiated: 'Initiated',
    initiationDate: 'Initiation date',
    initiatorName: 'Initiator name',
    idDocPrimary: 'Identity document',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    noDocument: 'No file submitted',
    approve: 'Approve membership',
    revokeApproval: 'Revoke approval',
    requestReview: 'Request review',
    noteRequired: 'Please add a note before requesting a review.',
    adminNote: 'Admin note',
    saveNote: 'Save note',
    noteSaved: 'Note saved.',
    actionError: 'Action failed',
    snapshotHistory: 'Approved membership history',
    snapshotApprovedOn: 'Approved on',
    snapshotNone: 'No approved snapshots recorded.'
  },
  es: {
    title: 'Perfil del candidato',
    submittedAt: 'Enviado el',
    name: 'Nombre completo',
    email: 'Correo de inicio de sesión',
    email2: 'Correo secundario',
    preferredCommunicationEmail: 'Correo preferido',
    preferredLoginEmail: 'Correo de inicio de sesión',
    preferredSecondaryEmail: 'Correo secundario',
    phone: 'Teléfono',
    mobile: 'Móvil',
    fiscalCode: 'Código fiscal',
    idType: 'Tipo de documento',
    idTypePassport: 'Pasaporte',
    idTypeIdCard: 'Documento de identidad',
    sex: 'Sexo asignado al nacer',
    birthDate: 'Fecha de nacimiento',
    birthPlace: 'Lugar de nacimiento',
    birthCountry: 'País de nacimiento',
    citizenship: 'Ciudadanía',
    nationality: 'Nacionalidad',
    address: 'Dirección',
    city: 'Ciudad',
    country: 'País',
    currentChurch: 'Iglesia actual',
    originChurch: 'Iglesia de origen',
    firstWorkParticipation: 'Participó en un trabajo de Santo Daime',
    firstWorkDate: 'Fecha del primer trabajo',
    firstWorkChurch: 'Iglesia del primer trabajo',
    isInitiated: 'Iniciado',
    initiationDate: 'Fecha de iniciación',
    initiatorName: 'Nombre del iniciador',
    idDocPrimary: 'Documento de identidad',
    yes: 'Sí',
    no: 'No',
    close: 'Cerrar',
    noDocument: 'Ningún archivo enviado',
    approve: 'Aprobar membresía',
    revokeApproval: 'Revocar aprobación',
    requestReview: 'Solicitar revisión',
    noteRequired: 'Añada una nota antes de solicitar la revisión.',
    adminNote: 'Nota administrativa',
    saveNote: 'Guardar nota',
    noteSaved: 'Nota guardada.',
    actionError: 'Error al ejecutar la acción',
    snapshotHistory: 'Historial de perfiles aprobados',
    snapshotApprovedOn: 'Aprobado el',
    snapshotNone: 'Ningún perfil aprobado registrado.'
  },
  it: {
    title: 'Profilo del candidato',
    submittedAt: 'Inviato il',
    name: 'Nome completo',
    email: 'Email di login',
    email2: 'Email secondaria',
    preferredCommunicationEmail: 'Email preferita',
    preferredLoginEmail: 'Email di login',
    preferredSecondaryEmail: 'Email secondaria',
    phone: 'Telefono',
    mobile: 'Cellulare',
    fiscalCode: 'Codice fiscale',
    idType: 'Tipo di documento',
    idTypePassport: 'Passaporto',
    idTypeIdCard: 'Carta d\'identità',
    sex: 'Sesso di nascita',
    birthDate: 'Data di nascita',
    birthPlace: 'Luogo di nascita',
    birthCountry: 'Paese di nascita',
    citizenship: 'Cittadinanza',
    nationality: 'Nazionalità',
    address: 'Indirizzo',
    city: 'Città',
    country: 'Paese',
    currentChurch: 'Chiesa attuale',
    originChurch: 'Chiesa di origine',
    firstWorkParticipation: 'Ha partecipato a un lavoro di Santo Daime',
    firstWorkDate: 'Data del primo lavoro',
    firstWorkChurch: 'Chiesa del primo lavoro',
    isInitiated: 'Iniziato',
    initiationDate: 'Data di iniziazione',
    initiatorName: 'Nome dell\'iniziatore',
    idDocPrimary: 'Documento d\'identità',
    yes: 'Sì',
    no: 'No',
    close: 'Chiudi',
    noDocument: 'Nessun file inviato',
    approve: 'Approva membro',
    revokeApproval: 'Revoca approvazione',
    requestReview: 'Richiedi revisione',
    noteRequired: 'Aggiungi una nota prima di richiedere la revisione.',
    adminNote: 'Nota admin',
    saveNote: 'Salva nota',
    noteSaved: 'Nota salvata.',
    actionError: 'Errore nell\'eseguire l\'azione',
    snapshotHistory: 'Storico profili approvati',
    snapshotApprovedOn: 'Approvato il',
    snapshotNone: 'Nessun profilo approvato registrato.'
  }
};

export function approvalStatusButtonClass(status: string) {
  const base = 'rounded-full px-2 py-1 text-xs font-medium transition cursor-pointer ';
  if (status === 'approved') return base + 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
  if (status === 'pending') return base + 'bg-amber-100 text-amber-800 hover:bg-amber-200';
  if (status === 'needs-info') return base + 'bg-orange-100 text-orange-800 hover:bg-orange-200';
  return base + 'bg-slate-100 text-slate-700 hover:bg-slate-200';
}

function UserDocumentLink({ name, path, fallback }: { name?: string; path?: string; fallback: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!path) {
    return <span className="text-slate-400 italic">{fallback}</span>;
  }

  return (
    <span>
      <a
        href={downloadUrl ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
        onClick={async event => {
          if (downloadUrl || loading) return;
          event.preventDefault();
          setLoading(true);
          setError('');
          try {
            const url = await resolveUserDocumentUrl(path);
            setDownloadUrl(url);
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar arquivo');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? '...' : (name ?? path.split('/').pop())}
      </a>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

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
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">{labels.title}</h2>
            <span className={approvalStatusButtonClass(status) + ' pointer-events-none'}>
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
          >
            {labels.close}
          </button>
        </div>

        {/* Profile fields */}
        <div className="divide-y divide-slate-100 px-6 py-2 text-sm">
          <ProfileSection>
            <ProfileRow label={labels.submittedAt} value={submittedAt} />
            <ProfileRow label={labels.name} value={displayName} />
            <ProfileRow label={labels.email} value={user.email} />
            {user.email2 ? <ProfileRow label={labels.email2} value={user.email2} /> : null}
            <ProfileRow
              label={labels.preferredCommunicationEmail}
              value={user.preferredCommunicationEmail === 'secondary' && user.email2
                ? labels.preferredSecondaryEmail
                : labels.preferredLoginEmail}
            />
            {user.phone ? <ProfileRow label={labels.phone} value={user.phone} /> : null}
            {user.mobile ? <ProfileRow label={labels.mobile} value={user.mobile} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.fiscalCode ? <ProfileRow label={labels.fiscalCode} value={user.fiscalCode} /> : null}
            {user.idType ? <ProfileRow label={labels.idType} value={idTypeLabel(user.idType, user.idTypeOther, labels)} /> : null}
            {user.sex ? <ProfileRow label={labels.sex} value={user.sex} /> : null}
            {user.birthDate ? <ProfileRow label={labels.birthDate} value={user.birthDate} /> : null}
            {user.birthPlace ? <ProfileRow label={labels.birthPlace} value={user.birthPlace} /> : null}
            {user.birthCountry ? <ProfileRow label={labels.birthCountry} value={user.birthCountry} /> : null}
            {user.citizenship ? <ProfileRow label={labels.citizenship} value={user.citizenship} /> : null}
            {user.nationality ? <ProfileRow label={labels.nationality} value={user.nationality} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.address ? <ProfileRow label={labels.address} value={user.address} /> : null}
            {user.city ? <ProfileRow label={labels.city} value={user.city} /> : null}
            {user.country ? <ProfileRow label={labels.country} value={user.country} /> : null}
          </ProfileSection>

          <ProfileSection>
            {user.currentChurchName ? <ProfileRow label={labels.currentChurch} value={user.currentChurchName} /> : null}
            {user.originChurchName ? <ProfileRow label={labels.originChurch} value={user.originChurchName} /> : null}
            <ProfileRow
              label={labels.firstWorkParticipation}
              value={user.hasParticipatedInSantoDaimeWork === true ? labels.yes : user.hasParticipatedInSantoDaimeWork === false ? labels.no : '—'}
            />
            {user.firstWorkDate ? <ProfileRow label={labels.firstWorkDate} value={user.firstWorkDate} /> : null}
            {user.firstWorkChurchName ? <ProfileRow label={labels.firstWorkChurch} value={user.firstWorkChurchName} /> : null}
            <ProfileRow
              label={labels.isInitiated}
              value={user.isInitiated === true ? labels.yes : user.isInitiated === false ? labels.no : '—'}
            />
            {user.initiationDate ? <ProfileRow label={labels.initiationDate} value={user.initiationDate} /> : null}
            {user.initiatorName ? <ProfileRow label={labels.initiatorName} value={user.initiatorName} /> : null}
          </ProfileSection>

          <ProfileSection>
            <div className="flex items-start gap-4 py-2">
              <span className="w-48 shrink-0 font-medium text-slate-600">{labels.idDocPrimary}</span>
              <UserDocumentLink
                name={user.identityDocumentPrimaryName}
                path={user.identityDocumentPrimaryPath}
                fallback={labels.noDocument}
              />
            </div>
          </ProfileSection>

          {/* Admin note */}
          <ProfileSection>
            <div className="flex flex-col gap-2 py-2">
              <label className="font-medium text-slate-600">{labels.adminNote}</label>
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
          </ProfileSection>
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

function ProfileSection({ children }: { children: ReactNode }) {
  return <div className="py-3 space-y-0.5">{children}</div>;
}

/** Names the ID document a non-Italian applicant declared; "other" shows their own words. */
function idTypeLabel(idType: string, idTypeOther: string | undefined, labels: ProfileLabels) {
  if (idType === 'passport') return labels.idTypePassport;
  if (idType === 'idCard') return labels.idTypeIdCard;
  return idTypeOther || idType;
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-1">
      <span className="w-48 shrink-0 font-medium text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

