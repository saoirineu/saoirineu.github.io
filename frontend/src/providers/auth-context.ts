import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<void>;
  emailSignUp: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
