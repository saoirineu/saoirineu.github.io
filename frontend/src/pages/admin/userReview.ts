import type { SiteLocale } from '../../lib/siteLocale';

/**
 * Copy and styling shared by the applicant review screens — the user
 * administration table, the ICEFLU review queue and the modal both open — so a
 * status reads the same wherever it is shown.
 */
export type ProfileLabels = Record<string, string>;

export const profileLabelsByLocale: Record<SiteLocale, ProfileLabels> = {
  pt: {
    title: 'Perfil do candidato',
    submittedAt: 'Enviado em',
    close: 'Fechar',
    noDocument: 'Nenhum arquivo enviado',
    approve: 'Aprovar membro',
    revokeApproval: 'Cancelar aprovação',
    requestReview: 'Solicitar revisão',
    noteRequired: 'Adicione uma nota antes de solicitar revisão.',
    adminNote: 'Nota administrativa',
    saveNote: 'Salvar nota',
    noteSaved: 'Nota salva.',
    snapshotHistory: 'Histórico de perfis aprovados',
    snapshotApprovedOn: 'Aprovado em',
    snapshotNone: 'Nenhum perfil aprovado registrado.'
  },
  en: {
    title: 'Applicant profile',
    submittedAt: 'Submitted at',
    close: 'Close',
    noDocument: 'No file submitted',
    approve: 'Approve membership',
    revokeApproval: 'Revoke approval',
    requestReview: 'Request review',
    noteRequired: 'Please add a note before requesting a review.',
    adminNote: 'Admin note',
    saveNote: 'Save note',
    noteSaved: 'Note saved.',
    snapshotHistory: 'Approved membership history',
    snapshotApprovedOn: 'Approved on',
    snapshotNone: 'No approved snapshots recorded.'
  },
  es: {
    title: 'Perfil del candidato',
    submittedAt: 'Enviado el',
    close: 'Cerrar',
    noDocument: 'Ningún archivo enviado',
    approve: 'Aprobar membresía',
    revokeApproval: 'Revocar aprobación',
    requestReview: 'Solicitar revisión',
    noteRequired: 'Añada una nota antes de solicitar la revisión.',
    adminNote: 'Nota administrativa',
    saveNote: 'Guardar nota',
    noteSaved: 'Nota guardada.',
    snapshotHistory: 'Historial de perfiles aprobados',
    snapshotApprovedOn: 'Aprobado el',
    snapshotNone: 'Ningún perfil aprobado registrado.'
  },
  it: {
    title: 'Profilo del candidato',
    submittedAt: 'Inviato il',
    close: 'Chiudi',
    noDocument: 'Nessun file inviato',
    approve: 'Approva membro',
    revokeApproval: 'Revoca approvazione',
    requestReview: 'Richiedi revisione',
    noteRequired: 'Aggiungi una nota prima di richiedere la revisione.',
    adminNote: 'Nota admin',
    saveNote: 'Salva nota',
    noteSaved: 'Nota salvata.',
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
