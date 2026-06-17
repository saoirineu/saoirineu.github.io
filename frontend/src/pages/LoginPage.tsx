import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';
import { siteLocaleOptions } from '../lib/siteLocale';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';

const copyByLocale = {
  pt: {
    title: 'Portal São Irineu',
    subtitle: 'Aplicativo online do ICEFLU Europa',
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    forgotPassword: 'Esqueceu sua senha?',
    resetEmailRequired: 'Informe seu email para receber o link de redefinição.',
    resetSent: 'Enviamos um link de redefinição de senha para seu email.',
    resetError: 'Erro ao enviar o link de redefinição.',
    passwordMismatch: 'As senhas não coincidem.',
    invalidPasswordTitle: 'Senha incorreta',
    invalidPasswordMessage: 'A senha usada está incorreta. Tente novamente ou solicite um link de redefinição.',
    verificationTitle: 'Confirme seu email',
    signIn: 'Entrar',
    signUp: 'Criar conta',
    or: 'ou',
    google: 'Entrar com Google',
    signInError: 'Erro ao autenticar.',
    googleError: 'Erro ao autenticar com Google.',
    verificationSent: 'Conta criada. Verifique sua caixa de entrada e confirme o email antes de entrar.',
    verificationSpamHint: 'Se não encontrar a mensagem, verifique também a pasta de spam.',
    newHere: 'Novo por aqui?',
    alreadyHave: 'Já tem conta?',
    switchToSignUp: 'Criar conta',
    switchToSignIn: 'Fazer login',
    modalOk: 'Entendi',
    language: 'Idioma'
  },
  en: {
    title: 'São Irineu Portal',
    subtitle: 'ICEFLU Europe\'s Online App',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    forgotPassword: 'Forgot your password?',
    resetEmailRequired: 'Enter your email to receive the reset link.',
    resetSent: 'We sent a password reset link to your email.',
    resetError: 'Error sending the reset link.',
    passwordMismatch: 'Passwords do not match.',
    invalidPasswordTitle: 'Incorrect password',
    invalidPasswordMessage: 'The password used is incorrect. Try again or request a reset link.',
    verificationTitle: 'Confirm your email',
    signIn: 'Sign in',
    signUp: 'Create account',
    or: 'or',
    google: 'Continue with Google',
    signInError: 'Authentication failed.',
    googleError: 'Google authentication failed.',
    verificationSent: 'Account created. Check your inbox and confirm your email before signing in.',
    verificationSpamHint: 'If you do not see the message, check your spam folder too.',
    newHere: 'New here?',
    alreadyHave: 'Already have an account?',
    switchToSignUp: 'Create account',
    switchToSignIn: 'Sign in',
    modalOk: 'Got it',
    language: 'Language'
  },
  es: {
    title: 'Portal São Irineu',
    subtitle: 'Aplicación online de ICEFLU Europa',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    forgotPassword: '¿Olvidó su contraseña?',
    resetEmailRequired: 'Ingrese su correo para recibir el enlace de restablecimiento.',
    resetSent: 'Enviamos un enlace para restablecer la contraseña a su correo.',
    resetError: 'Error al enviar el enlace de restablecimiento.',
    passwordMismatch: 'Las contraseñas no coinciden.',
    invalidPasswordTitle: 'Contraseña incorrecta',
    invalidPasswordMessage: 'La contraseña usada es incorrecta. Inténtelo de nuevo o solicite un enlace de restablecimiento.',
    verificationTitle: 'Confirme su correo',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    or: 'o',
    google: 'Entrar con Google',
    signInError: 'Error al autenticar.',
    googleError: 'Error al autenticar con Google.',
    verificationSent: 'Cuenta creada. Revise su bandeja de entrada y confirme el correo antes de entrar.',
    verificationSpamHint: 'Si no encuentra el mensaje, revise también la carpeta de spam.',
    newHere: '¿Nuevo por aquí?',
    alreadyHave: '¿Ya tiene cuenta?',
    switchToSignUp: 'Crear cuenta',
    switchToSignIn: 'Iniciar sesión',
    modalOk: 'Entendido',
    language: 'Idioma'
  },
  it: {
    title: 'Portale São Irineu',
    subtitle: 'App online di ICEFLU Europa',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Conferma password',
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
    forgotPassword: 'Hai dimenticato la password?',
    resetEmailRequired: 'Inserisci la tua email per ricevere il link di reimpostazione.',
    resetSent: 'Abbiamo inviato un link per reimpostare la password alla tua email.',
    resetError: 'Errore durante l\'invio del link di reimpostazione.',
    passwordMismatch: 'Le password non coincidono.',
    invalidPasswordTitle: 'Password errata',
    invalidPasswordMessage: 'La password usata non è corretta. Riprova o richiedi un link di reimpostazione.',
    verificationTitle: 'Conferma la tua email',
    signIn: 'Accedi',
    signUp: 'Crea account',
    or: 'oppure',
    google: 'Accedi con Google',
    signInError: 'Errore di autenticazione.',
    googleError: 'Errore durante l\'autenticazione con Google.',
    verificationSent: 'Account creato. Controlla la casella di posta e conferma l\'email prima di accedere.',
    verificationSpamHint: 'Se non trovi il messaggio, controlla anche la cartella spam.',
    newHere: 'Sei nuovo qui?',
    alreadyHave: 'Hai già un account?',
    switchToSignUp: 'Crea account',
    switchToSignIn: 'Accedi',
    modalOk: 'Ho capito',
    language: 'Lingua'
  }
} as const;

function isInvalidCredentialError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;

  return (
    code === 'auth/invalid-credential'
    || code === 'auth/wrong-password'
  );
}

export function LoginPage() {
  const { signInWithGoogle, emailSignIn, emailSignUp, sendPasswordReset } = useAuth();
  const { locale, setLocale } = useSiteLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | undefined)?.from?.pathname ?? '/';
  const copy = copyByLocale[locale];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [invalidPasswordModalOpen, setInvalidPasswordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setInvalidPasswordModalOpen(false);

    try {
      if (mode === 'signin') {
        await emailSignIn(email, password);
        navigate(from, { replace: true });
      } else {
        if (password !== passwordConfirmation) {
          throw new Error(copy.passwordMismatch);
        }
        await emailSignUp(email, password);
        setMode('signin');
        setPassword('');
        setPasswordConfirmation('');
        setVerificationModalOpen(true);
      }
    } catch (err) {
      if (mode === 'signin' && isInvalidCredentialError(err)) {
        setInvalidPasswordModalOpen(true);
        return;
      }
      setError(err instanceof Error ? err.message : copy.signInError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setVerificationModalOpen(false);
    setInvalidPasswordModalOpen(false);
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.googleError);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setNotice(null);
    setInvalidPasswordModalOpen(false);

    if (!email) {
      setError(copy.resetEmailRequired);
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setNotice(copy.resetSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.resetError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fbfaf5_0%,#fbfaf5_34%,#dcebf7_34%,#c4def2_67%,#dbece4_67%,#c7dfd3_100%)] p-6">
      <div className="pointer-events-none absolute left-[8%] top-[8%] h-40 w-40 rounded-full bg-[rgba(232,194,76,0.22)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-[10%] top-[28%] h-48 w-48 rounded-full bg-[rgba(63,132,194,0.15)] blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md rounded-[28px] border border-[color:var(--brand-sand)] bg-[rgba(255,255,255,0.92)] p-8 pt-14 shadow-[0_24px_80px_var(--brand-shadow)]">
        <label className="absolute right-5 top-5">
          <span className="sr-only">{copy.language}</span>
          <select
            className="rounded-full border border-[color:var(--brand-sand)] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[color:var(--brand-blue-deep)] shadow-sm"
            value={locale}
            onChange={event => setLocale(event.target.value as typeof locale)}
          >
            {siteLocaleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-4 h-16 w-16" decorative />
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--brand-ink)]">{copy.title}</h1>
          <p className="mt-2 text-sm font-medium text-[color:rgba(36,54,77,0.72)]">{copy.subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleEmail}>
          <label className="block text-sm font-medium text-[color:var(--brand-ink)]">
            {copy.email}
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[color:var(--brand-sand)] bg-white/90 px-3 py-2 text-sm text-[color:var(--brand-ink)] shadow-sm focus:border-[color:var(--brand-blue-deep)] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-[color:var(--brand-ink)]">
            {copy.password}
            <span className="mt-1 flex rounded-2xl border border-[color:var(--brand-sand)] bg-white/90 shadow-sm focus-within:border-[color:var(--brand-blue-deep)]">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="min-w-0 flex-1 rounded-l-2xl bg-transparent px-3 py-2 text-sm text-[color:var(--brand-ink)] focus:outline-none"
              />
              <button
                type="button"
                className="shrink-0 rounded-r-2xl px-3 text-xs font-semibold text-[color:var(--brand-blue-deep)] transition hover:bg-[rgba(247,244,234,0.95)]"
                onClick={() => setShowPassword(current => !current)}
              >
                {showPassword ? copy.hidePassword : copy.showPassword}
              </button>
            </span>
          </label>

          {mode === 'signup' && (
            <label className="block text-sm font-medium text-[color:var(--brand-ink)]">
              {copy.confirmPassword}
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordConfirmation}
                onChange={e => setPasswordConfirmation(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[color:var(--brand-sand)] bg-white/90 px-3 py-2 text-sm text-[color:var(--brand-ink)] shadow-sm focus:border-[color:var(--brand-blue-deep)] focus:outline-none"
              />
            </label>
          )}

          {mode === 'signin' && (
            <div className="-mt-2 text-right">
              <button
                type="button"
                disabled={submitting}
                className="text-xs font-semibold text-[color:var(--brand-blue-deep)] underline decoration-[color:var(--brand-gold)] underline-offset-4 disabled:opacity-70"
                onClick={handlePasswordReset}
              >
                {copy.forgotPassword}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[color:var(--brand-blue-deep)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-white)] transition hover:bg-[color:var(--brand-green)] disabled:opacity-70"
          >
            {mode === 'signin' ? copy.signIn : copy.signUp}
          </button>
        </form>

        <div className="my-4 text-center text-xs text-[color:rgba(36,54,77,0.56)]">{copy.or}</div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--brand-sand)] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-ink)] transition hover:bg-[rgba(247,244,234,0.95)] disabled:opacity-70"
        >
          <span>{copy.google}</span>
        </button>

        {notice && <p className="mt-4 text-sm text-green-700">{notice}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 text-center text-sm text-[color:rgba(36,54,77,0.72)]">
          {mode === 'signin' ? copy.newHere : copy.alreadyHave}
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--brand-blue-deep)] underline decoration-[color:var(--brand-gold)] underline-offset-4"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
              setVerificationModalOpen(false);
              setInvalidPasswordModalOpen(false);
              setPasswordConfirmation('');
            }}
          >
            {mode === 'signin' ? copy.switchToSignUp : copy.switchToSignIn}
          </button>
        </div>
      </div>

      {verificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-6">
          <div
            aria-labelledby="verification-modal-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-[color:var(--brand-sand)] bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
            role="dialog"
          >
            <BrandMark className="mx-auto mb-4 h-12 w-12" decorative />
            <h2 id="verification-modal-title" className="text-lg font-bold text-[color:var(--brand-ink)]">
              {copy.verificationTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(36,54,77,0.76)]">{copy.verificationSent}</p>
            <p className="mt-2 text-sm leading-6 text-[color:rgba(36,54,77,0.76)]">{copy.verificationSpamHint}</p>
            <button
              type="button"
              className="mt-6 w-full rounded-2xl bg-[color:var(--brand-blue-deep)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-white)] transition hover:bg-[color:var(--brand-green)]"
              onClick={() => setVerificationModalOpen(false)}
            >
              {copy.modalOk}
            </button>
          </div>
        </div>
      )}

      {invalidPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-6">
          <div
            aria-labelledby="invalid-password-modal-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-[color:var(--brand-sand)] bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
            role="dialog"
          >
            <h2 id="invalid-password-modal-title" className="text-lg font-bold text-[color:var(--brand-ink)]">
              {copy.invalidPasswordTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(36,54,77,0.76)]">{copy.invalidPasswordMessage}</p>
            <button
              type="button"
              className="mt-6 w-full rounded-2xl bg-[color:var(--brand-blue-deep)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-white)] transition hover:bg-[color:var(--brand-green)]"
              onClick={() => setInvalidPasswordModalOpen(false)}
            >
              {copy.modalOk}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
