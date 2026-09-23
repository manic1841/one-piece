import { getAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { FIRESTORE_PROXY_PATH } from '@/infra/emulatorEndpoints';

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

if (import.meta.env.VITE_FIRESTORE_EMULATOR === 'true') {
  // Escape hatch for browsers that run inside the compose network and can resolve
  // the `firebase` service hostname themselves.
  const directHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string | undefined;

  if (directHost) {
    connectFirestoreEmulator(db, directHost, 8080);
    connectAuthEmulator(auth, `http://${directHost}:9099`);
  } else {
    // Default: same-origin through the Vite dev-server proxy. The host usually
    // publishes only the app port, so the browser cannot reach the emulator's
    // 8080/9099 directly.
    //
    // The Firestore SDK builds its channel base URL as `http://${host}:${port}`,
    // so a path prefix has to travel inside the `port` argument.
    const proxiedFirestorePort = `${window.location.port}${FIRESTORE_PROXY_PATH}`;
    connectFirestoreEmulator(
      db,
      window.location.hostname,
      proxiedFirestorePort as unknown as number,
    );
    // connectAuthEmulator discards any path in the URL ("Always replace path with
    // '/'" in the SDK), so the origin alone is correct: the SDK then requests
    // `<origin>/identitytoolkit.googleapis.com/...`, which the proxy forwards.
    connectAuthEmulator(auth, window.location.origin);
  }
}

export const googleProvider = new GoogleAuthProvider();
export { db, auth, storage, analytics };
