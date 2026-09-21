import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD_Ig65edsAT1j9BXvBqpqajhmNvRXdF88',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'squadmaps-3e8e6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'squadmaps-3e8e6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'squadmaps-3e8e6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '242638747921',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:242638747921:web:d1f12943e9b4cdb76d34b0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-Q3YR0TQ46B'
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== '' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== ''
  );
};

let app: any = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
    console.info('Connected to live Firebase backend.');
  } catch (err) {
    console.warn('Firebase initialization error, running in local real-time sync mode:', err);
  }
} else {
  console.info('Firebase keys not detected in .env. Running in built-in multi-tab real-time sync mode.');
}

export { app, db, auth, analytics };
