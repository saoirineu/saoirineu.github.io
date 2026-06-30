import { useEffect, useState, type ReactNode } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
    emailSignIn: (email, password) => signInWithEmailAndPassword(auth, email, password).then(() => undefined),
    emailSignUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
      await httpsCallable(functions, 'sendVerificationEmailCallable')();
      await firebaseSignOut(auth);
    },
    sendPasswordReset: email => sendPasswordResetEmail(auth, email).then(() => undefined),
    refreshCurrentUser: async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      if (canSyncProfile(auth.currentUser)) {
        void syncUserProfileForLogin(auth.currentUser).catch(() => undefined);
      }
      setUser(auth.currentUser);
      forceAuthUpdate(current => current + 1);
    },
    sendVerificationEmail: async () => {
      if (!auth.currentUser) return;
      await httpsCallable(functions, 'sendVerificationEmailCallable')();
    },
    signOut: () => firebaseSignOut(auth)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
