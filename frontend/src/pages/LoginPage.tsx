import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';
import { siteLocaleOptions } from '../lib/siteLocale';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';

const copyByLocale = {
  pt: {
    title: 'São Irineu',
    eventBanner: 'Encontro Europeu 2026',
    email: 'Email',
    password: 'Senha',
    signIn: 'Entrar',
    signUp: 'Criar conta',
    or: 'ou',
    google: 'Entrar com Google',
    signInError: 'Erro ao autenticar.',
    googleError: 'Erro ao autenticar com Google.',
    newHere: 'Novo por aqui?',
    alreadyHave: 'Já tem conta?',
    switchToSignUp: 'Criar conta',
    switchToSignIn: 'Fazer login',
    language: 'Idioma'
  },
  en: {
    title: 'São Irineu',
    eventBanner: 'European Gathering 2026',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    or: 'or',
    google: 'Continue with Google',
    signInError: 'Authentication failed.',
    googleError: 'Google authentication failed.',
    newHere: 'New here?',
    alreadyHave: 'Already have an account?',
    switchToSignUp: 'Create account',
    switchToSignIn: 'Sign in',
    language: 'Language'
  },
  es: {
    title: 'São Irineu',
    eventBanner: 'Encuentro Europeo 2026',
    email: 'Correo electrónico',
    password: 'Contraseña',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    or: 'o',
    google: 'Entrar con Google',
    signInError: 'Error al autenticar.',
    googleError: 'Error al autenticar con Google.',
    newHere: '¿Nuevo por aquí?',
    alreadyHave: '¿Ya tiene cuenta?',
    switchToSignUp: 'Crear cuenta',
    switchToSignIn: 'Iniciar sesión',
    language: 'Idioma'
  },
  it: {
    title: 'São Irineu',
    eventBanner: 'Incontro Europeo 2026',
    email: 'Email',
    password: 'Password',
    signIn: 'Accedi',
    signUp: 'Crea account',
    or: 'oppure',
    google: 'Accedi con Google',
    signInError: 'Errore di autenticazione.',
    googleError: 'Errore durante l\'autenticazione con Google.',
    newHere: 'Sei nuovo qui?',
    alreadyHave: 'Hai già un account?',
    switchToSignUp: 'Crea account',
    switchToSignIn: 'Accedi',
    language: 'Lingua'
  }
} as const;

export function LoginPage() {
  const { signInWithGoogle, emailSignIn, emailSignUp } = useAuth();
  const { locale, setLocale } = useSiteLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | undefined)?.from?.pathname ?? '/';
  const copy = copyByLocale[locale];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'signin') {
        await emailSignIn(email, password);
      } else {
        await emailSignUp(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.signInError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.googleError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fbfaf5_0%,#fbfaf5_34%,#dcebf7_34%,#c4def2_67%,#dbece4_67%,#c7dfd3_100%)] p-6">
      <div className="pointer-events-none absolute left-[8%] top-[8%] h-40 w-40 rounded-full bg-[rgba(232,194,76,0.22)] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-[10%] top-[28%] h-48 w-48 rounded-full bg-[rgba(63,132,194,0.15)] blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md rounded-[28px] border border-[color:var(--brand-sand)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_24px_80px_var(--brand-shadow)]">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-4 h-16 w-16" decorative />
          <div className="mb-4 rounded-2xl bg-[linear-gradient(135deg,rgba(232,194,76,0.28),rgba(63,132,194,0.18))] px-4 py-2.5 text-center">
            <span className="text-sm font-semibold tracking-wide text-[color:var(--brand-blue-deep)]">
              ✦ {copy.eventBanner} ✦
            </span>
          </div>
          <div className="mb-4 flex justify-center">
            <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--brand-blue-deep)]">
              <span>{copy.language}</span>
              <select
                className="rounded-full border border-[color:var(--brand-sand)] bg-white px-3 py-2 text-sm text-[color:var(--brand-ink)] shadow-sm"
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
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--brand-ink)]">{copy.title}</h1>
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
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[color:var(--brand-sand)] bg-white/90 px-3 py-2 text-sm text-[color:var(--brand-ink)] shadow-sm focus:border-[color:var(--brand-blue-deep)] focus:outline-none"
            />
          </label>

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

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 text-center text-sm text-[color:rgba(36,54,77,0.72)]">
          {mode === 'signin' ? copy.newHere : copy.alreadyHave}
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--brand-blue-deep)] underline decoration-[color:var(--brand-gold)] underline-offset-4"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? copy.switchToSignUp : copy.switchToSignIn}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
