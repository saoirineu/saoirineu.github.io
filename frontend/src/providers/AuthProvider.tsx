import { useEffect, useState, type ReactNode } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut
} from 'firebase/auth';

import { auth, functions, googleProvider } from '../lib/firebase';
import { syncUserProfileForLogin } from '../lib/users';
import { AuthContext, type AuthContextValue } from './auth-context';

function isPopupBlockedError(error: unknown) {
  return error instanceof Error && error.message.includes('block the window');
}

/**
 * The branded confirmation email goes out through the organization's own SMTP
 * relay, which can refuse mail from the Cloud Functions egress (it has). Nobody
 * should be locked out of a new account by that, so fall back to the message
 * Firebase sends itself — plainer and from a firebaseapp.com address, but it
 * always leaves. Returns false only when both paths fail.
 */
async function deliverVerificationEmail(user: User): Promise<{ sent: boolean; detail?: string }> {
  let brandedDetail = '';
  try {
    await httpsCallable(functions, 'sendVerificationEmailCallable')();
    return { sent: true };
  } catch (brandedError) {
    console.warn('Branded confirmation email failed; falling back to Firebase', brandedError);
    brandedDetail = errorDetail(brandedError);
  }

  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}${import.meta.env.BASE_URL}`
    });
    return { sent: true };
  } catch (fallbackError) {
    console.error('Firebase confirmation email failed too', fallbackError);
    // Both routes are out, so report both: the branded one says why the
    // organization's relay refused, the fallback why Google would not stand in.
    return { sent: false, detail: [brandedDetail, errorDetail(fallbackError)].filter(Boolean).join(' | ') };
  }
}

function errorDetail(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return code && !message.includes(code) ? `${code}: ${message}` : message;
}

function canSyncProfile(user: User) {
  return !user.email || user.emailVerified;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, forceAuthUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && canSyncProfile(currentUser)) {
        void syncUserProfileForLogin(currentUser).catch(() => undefined);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithGoogle: async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        // Alguns navegadores/headers podem bloquear fechamento da popup; redireciona como fallback.
        if (isPopupBlockedError(err)) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }
    },
    emailSignIn: (email, password) =>
      signInWithEmailAndPassword(auth, email, password).then(credential => credential.user),
    emailSignUp: async (email, password) => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Stay signed in even when the mail fails: the confirmation modal's resend
      // button needs the session, and signing out here would leave the account
      // stranded with no way to ask for the link again.
      const { sent, detail } = await deliverVerificationEmail(credential.user);
      return { verificationSent: sent, verificationDetail: detail };
    },
    sendPasswordReset: email => sendPasswordResetEmail(auth, email).then(() => undefined),
    refreshCurrentUser: async () => {
      if (!auth.currentUser) return null;
      await auth.currentUser.reload();
      if (canSyncProfile(auth.currentUser)) {
        void syncUserProfileForLogin(auth.currentUser).catch(() => undefined);
      }
      setUser(auth.currentUser);
      forceAuthUpdate(current => current + 1);
      return auth.currentUser;
    },
    sendVerificationEmail: async () => {
      if (!auth.currentUser) {
        throw new Error('No signed-in account to confirm.');
      }
      const { sent, detail } = await deliverVerificationEmail(auth.currentUser);
      if (!sent) throw new Error(detail || 'Could not send the confirmation email.');
    },
    signOut: () => firebaseSignOut(auth)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
