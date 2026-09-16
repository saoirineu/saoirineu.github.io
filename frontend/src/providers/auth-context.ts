import { createContext } from 'react';
import type { User } from 'firebase/auth';

/**
 * Outcome of mailing a confirmation link. `sent`: ours left. `fallback-sent`: our mail
 * server refused twice, Firebase's own email left instead and ours is retried later.
 * `queued`: nothing left yet, ours is retried automatically. `failed`: nothing went out
 * and nothing is queued; `tooMany` means wait before asking again.
 */
export type VerificationDelivery = {
  state: 'sent' | 'fallback-sent' | 'queued' | 'failed';
  tooMany?: boolean;
  detail?: string;
};

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<User>;
  /** Creates the account and tries to mail the confirmation link; the account
   *  survives a mail failure, so the caller offers a resend instead of erroring. */
  emailSignUp: (email: string, password: string) => Promise<VerificationDelivery>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
  sendVerificationEmail: () => Promise<VerificationDelivery>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
