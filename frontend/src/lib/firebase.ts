import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Configure as variaveis VITE_FIREBASE_* no arquivo .env.local');
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (import.meta.env.DEV) {
  setLogLevel('debug');
  console.info('[Firebase] initialized', {
    apiKeySuffix: firebaseConfig.apiKey?.slice(-6),
    appId: firebaseConfig.appId,
    authDomain: firebaseConfig.authDomain,
    origin: typeof window === 'undefined' ? 'server' : window.location.origin,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
