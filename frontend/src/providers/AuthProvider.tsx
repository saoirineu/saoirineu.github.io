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
import { AuthContext, type AuthContextValue, type VerificationDelivery } from './auth-context';

function isPopupBlockedError(error: unknown) {
  return error instanceof Error && error.message.includes('block the window');
}

/**
 * The branded confirmation email goes out through the organization's mail relay,
 * whose hosting intermittently refuses Cloud Functions. The function queues it and
 * keeps retrying, but a person waiting on this screen should not depend on that, so
 * whenever ours did not leave at once, also ask Firebase to send its own message —
 * plainer, in English, from noreply@sao-irineu.firebaseapp.com, but it leaves now.
 * The queued retry stops by itself once the address is confirmed.
 */
async function deliverVerificationEmail(user: User): Promise<VerificationDelivery> {
  let brandedDetail = '';
  let queued = false;
  let tooMany = false;
  try {
    const result = await httpsCallable<unknown, { status?: string }>(functions, 'sendVerificationEmailCallable')();
    const status = result.data?.status;
    // Deployments before the queue answer { sent: true } with no status.
    if (!status || status === 'sent' || status === 'already-verified') return { state: 'sent' };
    queued = true;
  } catch (brandedError) {
    console.warn('Branded confirmation email failed; falling back to Firebase', brandedError);
    brandedDetail = errorDetail(brandedError);
    tooMany = errorCodeOf(brandedError) === 'functions/resource-exhausted';
  }

  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}${import.meta.env.BASE_URL}`
    });
    return { state: 'sent' };
  } catch (fallbackError) {
    console.error('Firebase confirmation email failed too', fallbackError);
    // Ours is still being retried: the person only has to wait.
    if (queued) return { state: 'queued' };
    // Both routes are out, so report both: the branded one says why the
    // organization's relay refused, the fallback why Google would not stand in.
    return {
      state: 'failed',
      tooMany: tooMany || errorCodeOf(fallbackError) === 'auth/too-many-requests',
      detail: [brandedDetail, errorDetail(fallbackError)].filter(Boolean).join(' | ')
    };
  }
}

function errorCodeOf(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
}

function errorDetail(error: unknown) {
  const code = errorCodeOf(error);
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
      return deliverVerificationEmail(credential.user);
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
        return { state: 'failed', detail: 'No signed-in account to confirm.' };
      }
      return deliverVerificationEmail(auth.currentUser);
    },
    signOut: () => firebaseSignOut(auth)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
