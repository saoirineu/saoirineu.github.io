import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';

const loadingCopy = {
  pt: 'Carregando sessão...',
  en: 'Loading session...',
  es: 'Cargando sesión...',
  it: 'Caricamento sessione...'
} as const;

const verificationCopy = {
  pt: {
    title: 'Confirme seu email',
    body: 'Enviamos um link de confirmação para sua caixa de entrada. Depois de confirmar, volte aqui e atualize a sessão.',
    sent: 'Email de confirmação reenviado.',
    error: 'Não foi possível enviar o email de confirmação.',
    refresh: 'Já confirmei',
    resend: 'Reenviar email',
    signOut: 'Sair'
  },
  en: {
    title: 'Confirm your email',
    body: 'We sent a confirmation link to your inbox. After confirming it, come back here and refresh the session.',
    sent: 'Confirmation email sent again.',
    error: 'Could not send the confirmation email.',
    refresh: 'I have confirmed',
    resend: 'Resend email',
    signOut: 'Sign out'
  },
  es: {
    title: 'Confirme su correo',
    body: 'Enviamos un enlace de confirmación a su bandeja de entrada. Después de confirmarlo, vuelva aquí y actualice la sesión.',
    sent: 'Correo de confirmación reenviado.',
    error: 'No fue posible enviar el correo de confirmación.',
    refresh: 'Ya confirmé',
    resend: 'Reenviar correo',
    signOut: 'Salir'
  },
  it: {
    title: 'Conferma la tua email',
    body: 'Abbiamo inviato un link di conferma alla tua casella di posta. Dopo averlo confermato, torna qui e aggiorna la sessione.',
    sent: 'Email di conferma reinviata.',
    error: 'Non è stato possibile inviare l\'email di conferma.',
    refresh: 'Ho confermato',
    resend: 'Reinvia email',
    signOut: 'Esci'
  }
} as const;

export function AuthGate() {
  const { user, loading, refreshCurrentUser, sendVerificationEmail, signOut } = useAuth();
  const { locale } = useSiteLocale();
  const location = useLocation();
  const copy = verificationCopy[locale];
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <span className="animate-pulse text-lg">{loadingCopy[locale]}</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.email && !user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
          <p className="mt-3 text-sm font-medium text-slate-800">{user.email}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              onClick={async () => {
                setBusy(true);
                setStatus('idle');
                try {
                  await refreshCurrentUser();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {copy.refresh}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              onClick={async () => {
                setBusy(true);
                setStatus('idle');
                try {
                  await sendVerificationEmail();
                  setStatus('sent');
                } catch {
                  setStatus('error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {copy.resend}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              onClick={() => signOut()}
            >
              {copy.signOut}
            </button>
          </div>

          {status === 'sent' ? <p className="mt-4 text-sm text-green-700">{copy.sent}</p> : null}
          {status === 'error' ? <p className="mt-4 text-sm text-red-600">{copy.error}</p> : null}
        </div>
      </div>
    );
  }

  return <Outlet />;
}
