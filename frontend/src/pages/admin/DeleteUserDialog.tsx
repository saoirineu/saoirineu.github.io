import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import type { SiteLocale } from '../../lib/siteLocale';
import { deleteUserAccount, type UserProfile } from '../../lib/users';

const copyByLocale = {
  pt: {
    title: 'Remover usuário',
    warning: 'Isto apaga o perfil, os consensos, os documentos enviados e a conta de acesso. Não há como desfazer.',
    typeToConfirm: (value: string) => `Digite ${value} para confirmar:`,
    cancel: 'Cancelar',
    remove: 'Remover definitivamente',
    removing: 'Removendo...'
  },
  en: {
    title: 'Remove user',
    warning: 'This deletes the profile, the consents, the uploaded documents and the login account. It cannot be undone.',
    typeToConfirm: (value: string) => `Type ${value} to confirm:`,
    cancel: 'Cancel',
    remove: 'Remove permanently',
    removing: 'Removing...'
  },
  es: {
    title: 'Eliminar usuario',
    warning: 'Esto borra el perfil, los consentimientos, los documentos enviados y la cuenta de acceso. No se puede deshacer.',
    typeToConfirm: (value: string) => `Escriba ${value} para confirmar:`,
    cancel: 'Cancelar',
    remove: 'Eliminar definitivamente',
    removing: 'Eliminando...'
  },
  it: {
    title: 'Rimuovi utente',
    warning: "Questo elimina il profilo, i consensi, i documenti caricati e l'account di accesso. Non è reversibile.",
    typeToConfirm: (value: string) => `Scrivi ${value} per confermare:`,
    cancel: 'Annulla',
    remove: 'Rimuovi definitivamente',
    removing: 'Rimozione...'
  }
} as const;

/**
 * Confirmation for the irreversible wipe. The admin must retype the user's
 * email (or uid, when there is no email) so a stray click cannot destroy a
 * member's record.
 */
export function DeleteUserDialog({
  user,
  locale,
  onClose,
  onDeleted
}: {
  user: UserProfile;
  locale: SiteLocale;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const copy = copyByLocale[locale];
  const [typed, setTyped] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const expected = user.email ?? user.uid;
  const confirmed = typed.trim().toLowerCase() === expected.toLowerCase();

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(user.uid),
    onSuccess: onDeleted,
    onError: (error: unknown) => setErrorMsg(error instanceof Error ? error.message : String(error))
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{copy.warning}</p>

        <p className="mt-4 text-sm font-medium text-slate-800">{expected}</p>
        <label className="mt-2 block text-xs text-slate-600">
          {copy.typeToConfirm(expected)}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={typed}
            autoFocus
            onChange={event => {
              setTyped(event.target.value);
              setErrorMsg('');
            }}
          />
        </label>

        {errorMsg ? <p className="mt-2 text-sm text-red-600">{errorMsg}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!confirmed || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? copy.removing : copy.remove}
          </button>
        </div>
      </div>
    </div>
  );
}
