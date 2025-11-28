import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo',
  authDomain: 'one-piece-4e822.firebaseapp.com',
  projectId: 'one-piece-4e822',
  storageBucket: 'one-piece-4e822.firebasestorage.app',
  messagingSenderId: '829742952504',
  appId: '1:829742952504:web:b393e78707ecd29ea276cd',
  measurementId: 'G-W7VDSG0XE9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
let analytics;

if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const googleProvider = new GoogleAuthProvider();
export { db, auth, storage, analytics };
