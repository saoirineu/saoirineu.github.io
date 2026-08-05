import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
    signIn: 'Entrar',
    signUp: 'Criar conta',
    or: 'ou',
    google: 'Entrar com Google',
    newHere: 'Novo por aqui?',
    alreadyHave: 'Já tem conta?',
    switchToSignUp: 'Criar conta',
    switchToSignIn: 'Fazer login',
    language: 'Idioma',
    modalOk: 'Entendi',
    closeModal: 'Fechar',
    emailInUseTitle: 'Email já cadastrado',
    emailInUseMessage: 'Já existe uma conta com este email. Faça login ou use "Esqueceu sua senha?" para recuperar o acesso.',
    invalidEmailTitle: 'Email inválido',
    invalidEmailMessage: 'Confira o endereço digitado: ele não parece um email válido.',
    weakPasswordTitle: 'Senha muito curta',
    weakPasswordMessage: 'Escolha uma senha com pelo menos 6 caracteres.',
    invalidPasswordTitle: 'Email ou senha incorretos',
    invalidPasswordMessage: 'Não foi possível entrar com esses dados. Tente novamente ou peça um link de redefinição em "Esqueceu sua senha?".',
    tooManyTitle: 'Tentativas demais',
    tooManyMessage: 'O acesso deste dispositivo foi bloqueado temporariamente após muitas tentativas. Aguarde alguns minutos e tente de novo.',
    networkTitle: 'Problema de conexão',
    networkMessage: 'Não conseguimos falar com o servidor. Verifique sua conexão com a internet e tente novamente.',
    userDisabledTitle: 'Conta desativada',
    userDisabledMessage: 'Esta conta foi desativada. Entre em contato com a administração do portal.',
    popupClosedTitle: 'Login cancelado',
    popupClosedMessage: 'A janela do Google foi fechada antes de concluir. Tente novamente.',
    passwordMismatchTitle: 'As senhas não coincidem',
    passwordMismatchMessage: 'As duas senhas são diferentes. Digite a mesma senha nos dois campos.',
    signInErrorTitle: 'Não foi possível entrar',
    signUpErrorTitle: 'Não foi possível criar a conta',
    googleErrorTitle: 'Falha no login com Google',
    unexpectedMessage: 'Algo deu errado. Tente novamente em instantes; se persistir, avise a administração do portal.',
    technicalDetail: 'Detalhe técnico:',
    resetEmailRequiredTitle: 'Informe seu email',
    resetEmailRequiredMessage: 'Digite seu endereço de email no campo acima para receber o link de redefinição.',
    resetSentTitle: 'Link de redefinição enviado',
    resetSentMessage: 'Enviamos um link de redefinição de senha para seu email. Confira também a pasta de SPAM.',
    resetErrorTitle: 'Não foi possível enviar o link',
    verificationTitle: 'Confirme seu email',
    verificationBody: (address: string) =>
      `Enviamos um link de confirmação para ${address}. Abra o link para ativar sua conta e depois faça login.`,
    verificationFailedBody: (address: string) =>
      `Sua conta foi criada, mas não conseguimos enviar o link de confirmação para ${address}. Use o botão abaixo para tentar de novo.`,
    verificationSpamHint: 'A mensagem pode levar alguns minutos. Se não encontrar, verifique a pasta de SPAM ou lixo eletrônico.',
    resend: 'Reenviar email',
    resendSent: 'Email de confirmação reenviado.',
    resendError: 'Ainda não foi possível enviar o email. Tente novamente em alguns minutos.'
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
    signIn: 'Sign in',
    signUp: 'Create account',
    or: 'or',
    google: 'Continue with Google',
    newHere: 'New here?',
    alreadyHave: 'Already have an account?',
    switchToSignUp: 'Create account',
    switchToSignIn: 'Sign in',
    language: 'Language',
    modalOk: 'Got it',
    closeModal: 'Close',
    emailInUseTitle: 'Email already registered',
    emailInUseMessage: 'There is already an account with this email. Sign in instead, or use "Forgot your password?" to recover access.',
    invalidEmailTitle: 'Invalid email',
    invalidEmailMessage: 'Check the address you typed: it does not look like a valid email.',
    weakPasswordTitle: 'Password too short',
    weakPasswordMessage: 'Choose a password with at least 6 characters.',
    invalidPasswordTitle: 'Incorrect email or password',
    invalidPasswordMessage: 'We could not sign you in with these details. Try again, or request a reset link with "Forgot your password?".',
    tooManyTitle: 'Too many attempts',
    tooManyMessage: 'Access from this device was temporarily blocked after too many failed attempts. Wait a few minutes and try again.',
    networkTitle: 'Connection problem',
    networkMessage: 'We could not reach the server. Check your internet connection and try again.',
    userDisabledTitle: 'Account disabled',
    userDisabledMessage: 'This account has been disabled. Please contact the portal administration.',
    popupClosedTitle: 'Sign-in cancelled',
    popupClosedMessage: 'The Google window was closed before finishing. Try again.',
    passwordMismatchTitle: 'Passwords do not match',
    passwordMismatchMessage: 'The two passwords are different. Type the same password in both fields.',
    signInErrorTitle: 'Could not sign in',
    signUpErrorTitle: 'Could not create the account',
    googleErrorTitle: 'Google sign-in failed',
    unexpectedMessage: 'Something went wrong. Try again in a moment; if it persists, contact the portal administration.',
    technicalDetail: 'Technical detail:',
    resetEmailRequiredTitle: 'Email needed',
    resetEmailRequiredMessage: 'Type your email address in the field above to receive the reset link.',
    resetSentTitle: 'Reset link sent',
    resetSentMessage: 'We sent a password reset link to your email. Check your SPAM folder too.',
    resetErrorTitle: 'Could not send the reset link',
    verificationTitle: 'Confirm your email',
    verificationBody: (address: string) =>
      `We sent a confirmation link to ${address}. Open it to activate your account, then sign in.`,
    verificationFailedBody: (address: string) =>
      `Your account was created, but we could not send the confirmation link to ${address}. Use the button below to try again.`,
    verificationSpamHint: 'The message can take a few minutes. If you do not see it, check your SPAM or junk folder.',
    resend: 'Resend email',
    resendSent: 'Confirmation email sent again.',
    resendError: 'We still could not send the email. Try again in a few minutes.'
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
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    or: 'o',
    google: 'Entrar con Google',
    newHere: '¿Nuevo por aquí?',
    alreadyHave: '¿Ya tiene cuenta?',
    switchToSignUp: 'Crear cuenta',
    switchToSignIn: 'Iniciar sesión',
    language: 'Idioma',
    modalOk: 'Entendido',
    closeModal: 'Cerrar',
    emailInUseTitle: 'Correo ya registrado',
    emailInUseMessage: 'Ya existe una cuenta con este correo. Inicie sesión o use "¿Olvidó su contraseña?" para recuperar el acceso.',
    invalidEmailTitle: 'Correo inválido',
    invalidEmailMessage: 'Revise la dirección escrita: no parece un correo válido.',
    weakPasswordTitle: 'Contraseña demasiado corta',
    weakPasswordMessage: 'Elija una contraseña de al menos 6 caracteres.',
    invalidPasswordTitle: 'Correo o contraseña incorrectos',
    invalidPasswordMessage: 'No pudimos iniciar sesión con estos datos. Inténtelo de nuevo o solicite un enlace de restablecimiento en "¿Olvidó su contraseña?".',
    tooManyTitle: 'Demasiados intentos',
    tooManyMessage: 'El acceso desde este dispositivo se bloqueó temporalmente tras demasiados intentos fallidos. Espere unos minutos e inténtelo de nuevo.',
    networkTitle: 'Problema de conexión',
    networkMessage: 'No pudimos comunicarnos con el servidor. Revise su conexión a internet e inténtelo de nuevo.',
    userDisabledTitle: 'Cuenta desactivada',
    userDisabledMessage: 'Esta cuenta ha sido desactivada. Contacte con la administración del portal.',
    popupClosedTitle: 'Inicio de sesión cancelado',
    popupClosedMessage: 'La ventana de Google se cerró antes de terminar. Inténtelo de nuevo.',
    passwordMismatchTitle: 'Las contraseñas no coinciden',
    passwordMismatchMessage: 'Las dos contraseñas son distintas. Escriba la misma contraseña en ambos campos.',
    signInErrorTitle: 'No fue posible entrar',
    signUpErrorTitle: 'No fue posible crear la cuenta',
    googleErrorTitle: 'Error al entrar con Google',
    unexpectedMessage: 'Algo salió mal. Inténtelo de nuevo en unos instantes; si persiste, avise a la administración del portal.',
    technicalDetail: 'Detalle técnico:',
    resetEmailRequiredTitle: 'Indique su correo',
    resetEmailRequiredMessage: 'Escriba su dirección de correo en el campo de arriba para recibir el enlace de restablecimiento.',
    resetSentTitle: 'Enlace de restablecimiento enviado',
    resetSentMessage: 'Enviamos un enlace para restablecer la contraseña a su correo. Revise también la carpeta de SPAM.',
    resetErrorTitle: 'No fue posible enviar el enlace',
    verificationTitle: 'Confirme su correo',
    verificationBody: (address: string) =>
      `Enviamos un enlace de confirmación a ${address}. Ábralo para activar su cuenta y después inicie sesión.`,
    verificationFailedBody: (address: string) =>
      `Su cuenta fue creada, pero no pudimos enviar el enlace de confirmación a ${address}. Use el botón de abajo para intentarlo de nuevo.`,
    verificationSpamHint: 'El mensaje puede tardar unos minutos. Si no lo encuentra, revise la carpeta de SPAM o correo no deseado.',
    resend: 'Reenviar correo',
    resendSent: 'Correo de confirmación reenviado.',
    resendError: 'Todavía no fue posible enviar el correo. Inténtelo de nuevo en unos minutos.'
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
    signIn: 'Accedi',
    signUp: 'Crea account',
    or: 'oppure',
    google: 'Accedi con Google',
    newHere: 'Sei nuovo qui?',
    alreadyHave: 'Hai già un account?',
    switchToSignUp: 'Crea account',
    switchToSignIn: 'Accedi',
    language: 'Lingua',
    modalOk: 'Ho capito',
    closeModal: 'Chiudi',
    emailInUseTitle: 'Email già registrata',
    emailInUseMessage: 'Esiste già un account con questa email. Accedi oppure usa "Hai dimenticato la password?" per recuperare l\'accesso.',
    invalidEmailTitle: 'Email non valida',
    invalidEmailMessage: 'Controlla l\'indirizzo inserito: non sembra un\'email valida.',
    weakPasswordTitle: 'Password troppo corta',
    weakPasswordMessage: 'Scegli una password di almeno 6 caratteri.',
    invalidPasswordTitle: 'Email o password errate',
    invalidPasswordMessage: 'Non siamo riusciti ad accedere con questi dati. Riprova oppure richiedi un link di reimpostazione con "Hai dimenticato la password?".',
    tooManyTitle: 'Troppi tentativi',
    tooManyMessage: 'L\'accesso da questo dispositivo è stato bloccato temporaneamente dopo troppi tentativi falliti. Attendi qualche minuto e riprova.',
    networkTitle: 'Problema di connessione',
    networkMessage: 'Non siamo riusciti a raggiungere il server. Controlla la connessione a internet e riprova.',
    userDisabledTitle: 'Account disattivato',
    userDisabledMessage: 'Questo account è stato disattivato. Contatta l\'amministrazione del portale.',
    popupClosedTitle: 'Accesso annullato',
    popupClosedMessage: 'La finestra di Google è stata chiusa prima di completare l\'accesso. Riprova.',
    passwordMismatchTitle: 'Le password non coincidono',
    passwordMismatchMessage: 'Le due password sono diverse. Inserisci la stessa password in entrambi i campi.',
    signInErrorTitle: 'Accesso non riuscito',
    signUpErrorTitle: 'Creazione account non riuscita',
    googleErrorTitle: 'Accesso con Google non riuscito',
    unexpectedMessage: 'Qualcosa è andato storto. Riprova tra poco; se il problema persiste, avvisa l\'amministrazione del portale.',
    technicalDetail: 'Dettaglio tecnico:',
    resetEmailRequiredTitle: 'Inserisci la tua email',
    resetEmailRequiredMessage: 'Scrivi il tuo indirizzo email nel campo qui sopra per ricevere il link di reimpostazione.',
    resetSentTitle: 'Link di reimpostazione inviato',
    resetSentMessage: 'Abbiamo inviato un link per reimpostare la password alla tua email. Controlla anche la cartella SPAM.',
    resetErrorTitle: 'Invio del link non riuscito',
    verificationTitle: 'Conferma la tua email',
    verificationBody: (address: string) =>
      `Abbiamo inviato un link di conferma a ${address}. Aprilo per attivare il tuo account e poi accedi.`,
    verificationFailedBody: (address: string) =>
      `Il tuo account è stato creato, ma non siamo riusciti a inviare il link di conferma a ${address}. Usa il pulsante qui sotto per riprovare.`,
    verificationSpamHint: 'Il messaggio può richiedere qualche minuto. Se non lo trovi, controlla la cartella SPAM o posta indesiderata.',
    resend: 'Reinvia email',
    resendSent: 'Email di conferma reinviata.',
    resendError: 'Non è stato ancora possibile inviare l\'email. Riprova tra qualche minuto.'
  }
} as const;

type Copy = (typeof copyByLocale)[keyof typeof copyByLocale];

type MessageModal = {
  title: string;
  body: string;
  detail?: string;
};

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

/**
 * Turns a Firebase error into something a person can act on. Anything we do not
 * recognise still gets a readable sentence, with the raw message kept as a
 * secondary line so a failure can be reported precisely.
 */
function describeError(error: unknown, copy: Copy, fallbackTitle: string): MessageModal {
  switch (errorCode(error)) {
    case 'auth/email-already-in-use':
      return { title: copy.emailInUseTitle, body: copy.emailInUseMessage };
    case 'auth/invalid-email':
      return { title: copy.invalidEmailTitle, body: copy.invalidEmailMessage };
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return { title: copy.weakPasswordTitle, body: copy.weakPasswordMessage };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { title: copy.invalidPasswordTitle, body: copy.invalidPasswordMessage };
    case 'auth/too-many-requests':
      return { title: copy.tooManyTitle, body: copy.tooManyMessage };
    case 'auth/network-request-failed':
      return { title: copy.networkTitle, body: copy.networkMessage };
    case 'auth/user-disabled':
      return { title: copy.userDisabledTitle, body: copy.userDisabledMessage };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return { title: copy.popupClosedTitle, body: copy.popupClosedMessage };
    default:
      return {
        title: fallbackTitle,
        body: copy.unexpectedMessage,
        detail: error instanceof Error ? error.message : undefined
      };
  }
}

function ModalShell({
  labelledBy,
  onClose,
  closeLabel,
  children
}: {
  labelledBy: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.42)] p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl border border-[color:var(--brand-sand)] bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        onClick={event => event.stopPropagation()}
        role="dialog"
      >
        <button
          type="button"
          aria-label={closeLabel}
          className="absolute right-4 top-3 text-xl leading-none text-[color:rgba(36,54,77,0.5)] transition hover:text-[color:var(--brand-ink)]"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const {
    signInWithGoogle,
    emailSignIn,
    emailSignUp,
    sendPasswordReset,
    sendVerificationEmail,
    refreshCurrentUser
  } = useAuth();
  const { locale, setLocale } = useSiteLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: Location; unverified?: boolean } | undefined;
  const from = state?.from?.pathname ?? '/';
  const copy = copyByLocale[locale];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [messageModal, setMessageModal] = useState<MessageModal | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'failed' | 'sent' | 'error'>('idle');
  const [resendDetail, setResendDetail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const verificationOpen = verificationEmail !== null;
  // Nothing reached the inbox, so the modal must not also claim it was sent.
  const sendFailed = resendStatus === 'failed' || resendStatus === 'error';
  const gateHandled = useRef(false);

  // Arriving from AuthGate means the session is unconfirmed. Reload first: the
  // person may have just followed the link from their inbox, in which case the
  // cached token is stale and they belong inside the app, not in this modal.
  useEffect(() => {
    if (!state?.unverified || gateHandled.current) return;
    gateHandled.current = true;

    let cancelled = false;
    void (async () => {
      const refreshed = await refreshCurrentUser().catch(() => null);
      if (cancelled) return;
      if (refreshed?.emailVerified) {
        navigate('/', { replace: true });
        return;
      }
      if (!refreshed?.email) return;
      setEmail(refreshed.email);
      setResendStatus('idle');
      setVerificationEmail(refreshed.email);
    })();

    return () => {
      cancelled = true;
    };
    // refreshCurrentUser and navigate are stable enough here; the ref guards re-entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.unverified]);

  useEffect(() => {
    if (!messageModal && !verificationOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMessageModal(null);
      setVerificationEmail(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [messageModal, verificationOpen]);

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setMessageModal(null);

    if (mode === 'signup' && password !== passwordConfirmation) {
      setMessageModal({ title: copy.passwordMismatchTitle, body: copy.passwordMismatchMessage });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const signedIn = await emailSignIn(email, password);
        if (signedIn.email && !signedIn.emailVerified) {
          setResendStatus('idle');
          setVerificationEmail(signedIn.email);
          return;
        }
        navigate(from, { replace: true });
      } else {
        const { verificationSent, verificationDetail } = await emailSignUp(email, password);
        setMode('signin');
        setPassword('');
        setPasswordConfirmation('');
        setResendStatus(verificationSent ? 'idle' : 'failed');
        setResendDetail(verificationDetail ?? null);
        setVerificationEmail(email);
      }
    } catch (err) {
      setMessageModal(
        describeError(err, copy, mode === 'signin' ? copy.signInErrorTitle : copy.signUpErrorTitle)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setMessageModal(null);
    setVerificationEmail(null);
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setMessageModal(describeError(err, copy, copy.googleErrorTitle));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setMessageModal(null);

    if (!email) {
      setMessageModal({ title: copy.resetEmailRequiredTitle, body: copy.resetEmailRequiredMessage });
      return;
    }

    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setMessageModal({ title: copy.resetSentTitle, body: copy.resetSentMessage });
    } catch (err) {
      setMessageModal(describeError(err, copy, copy.resetErrorTitle));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendBusy(true);
    setResendStatus('idle');
    setResendDetail(null);
    try {
      await sendVerificationEmail();
      setResendStatus('sent');
    } catch (err) {
      setResendStatus('error');
      setResendDetail(err instanceof Error ? err.message : null);
    } finally {
      setResendBusy(false);
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

        <div className="mt-6 text-center text-sm text-[color:rgba(36,54,77,0.72)]">
          {mode === 'signin' ? copy.newHere : copy.alreadyHave}
          <button
            type="button"
            className="ml-2 font-semibold text-[color:var(--brand-blue-deep)] underline decoration-[color:var(--brand-gold)] underline-offset-4"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessageModal(null);
              setVerificationEmail(null);
              setPasswordConfirmation('');
            }}
          >
            {mode === 'signin' ? copy.switchToSignUp : copy.switchToSignIn}
          </button>
        </div>
      </div>

      {verificationOpen && (
        <ModalShell
          labelledBy="verification-modal-title"
          closeLabel={copy.closeModal}
          onClose={() => setVerificationEmail(null)}
        >
          <BrandMark className="mx-auto mb-4 h-12 w-12" decorative />
          <h2 id="verification-modal-title" className="text-lg font-bold text-[color:var(--brand-ink)]">
            {copy.verificationTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:rgba(36,54,77,0.76)]">
            {sendFailed
              ? copy.verificationFailedBody(verificationEmail ?? '')
              : copy.verificationBody(verificationEmail ?? '')}
          </p>
          {!sendFailed && (
            <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--brand-blue-deep)]">
              {copy.verificationSpamHint}
            </p>
          )}

          <button
            type="button"
            disabled={resendBusy}
            className="mt-6 w-full rounded-2xl bg-[color:var(--brand-blue-deep)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-white)] transition hover:bg-[color:var(--brand-green)] disabled:opacity-70"
            onClick={handleResendVerification}
          >
            {copy.resend}
          </button>

          {resendStatus === 'sent' && <p className="mt-3 text-sm text-green-700">{copy.resendSent}</p>}
          {resendStatus === 'error' && <p className="mt-3 text-sm text-red-600">{copy.resendError}</p>}
          {sendFailed && resendDetail && (
            <p className="mt-3 break-words text-xs leading-5 text-[color:rgba(36,54,77,0.56)]">
              {copy.technicalDetail} {resendDetail}
            </p>
          )}
        </ModalShell>
      )}

      {messageModal && (
        <ModalShell
          labelledBy="message-modal-title"
          closeLabel={copy.closeModal}
          onClose={() => setMessageModal(null)}
        >
          <h2 id="message-modal-title" className="text-lg font-bold text-[color:var(--brand-ink)]">
            {messageModal.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:rgba(36,54,77,0.76)]">{messageModal.body}</p>
          {messageModal.detail && (
            <p className="mt-3 break-words text-xs leading-5 text-[color:rgba(36,54,77,0.56)]">
              {copy.technicalDetail} {messageModal.detail}
            </p>
          )}
          <button
            type="button"
            className="mt-6 w-full rounded-2xl bg-[color:var(--brand-blue-deep)] px-4 py-2.5 text-sm font-semibold text-[color:var(--brand-white)] transition hover:bg-[color:var(--brand-green)]"
            onClick={() => setMessageModal(null)}
          >
            {copy.modalOk}
          </button>
        </ModalShell>
      )}
    </div>
  );
}

export default LoginPage;
