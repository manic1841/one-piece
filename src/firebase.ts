import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'one-piece-4e822.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'one-piece-4e822',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'one-piece-4e822.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '829742952504',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:829742952504:web:b393e78707ecd29ea276cd',
  measurementId: 'G-W7VDSG0XE9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
let analytics;

if (typeof window !== 'undefined' && import.meta.env.VITE_FIRESTORE_EMULATOR !== 'true') {
  analytics = getAnalytics(app);
}

console.log(import.meta.env);
if (import.meta.env.VITE_FIRESTORE_EMULATOR === 'true') {
  console.log('Using Firestore & Auth Emulator');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

export const googleProvider = new GoogleAuthProvider();
export { db, auth, storage, analytics };
