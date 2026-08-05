import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<User>;
  /** Creates the account and tries to mail the confirmation link; the account
   *  survives a mail failure, so the caller offers a resend instead of erroring. */
  emailSignUp: (
    email: string,
    password: string
  ) => Promise<{ verificationSent: boolean; verificationDetail?: string }>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
  sendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
