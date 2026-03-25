import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BrandMark } from '../components/BrandMark';
import { siteLocaleOptions } from '../lib/siteLocale';
import { useAuth } from '../providers/useAuth';
import { useSiteLocale } from '../providers/useSiteLocale';

const copyByLocale = {
  pt: {
    title: 'São Irineu',
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-blue-700 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-4 h-14 w-14" decorative />
          <div className="mb-4 flex justify-center">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>{copy.language}</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
        </div>

        <form className="space-y-4" onSubmit={handleEmail}>
          <label className="block text-sm font-medium text-slate-700">
            {copy.email}
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {copy.password}
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {mode === 'signin' ? copy.signIn : copy.signUp}
          </button>
        </form>

        <div className="my-4 text-center text-xs text-slate-500">{copy.or}</div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-70"
        >
          <span>{copy.google}</span>
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === 'signin' ? copy.newHere : copy.alreadyHave}
          <button
            type="button"
            className="ml-2 font-semibold text-blue-700 underline"
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
