import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut
} from 'firebase/auth';

import { auth, googleProvider } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<void>;
  emailSignUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isPopupBlockedError(error: unknown) {
  return error instanceof Error && error.message.includes('block the window');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
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
      emailSignUp: (email, password) => createUserWithEmailAndPassword(auth, email, password).then(() => undefined),
      signOut: () => firebaseSignOut(auth)
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return ctx;
}
