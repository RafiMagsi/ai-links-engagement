import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: any;
let authInstance: Auth | null = null;

const initializeFirebase = () => {
  try {
    if (typeof window === 'undefined') return null;
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.warn('[Firebase] Failed to initialize:', error);
    return null;
  }
};

export const getAuthInstance = (): Auth | null => {
  if (!authInstance && typeof window !== 'undefined') {
    return initializeFirebase();
  }
  return authInstance;
};

export const auth: Auth = new Proxy({} as Auth, {
  get: (_target, prop: string | symbol) => {
    const instance = getAuthInstance();
    if (!instance) return undefined;
    const value = instance[prop as keyof Auth];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
}) as Auth;

export default app;
