import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from 'firebase/auth';

// In emulator mode the API key MUST equal the E2E session installer's key
// (`e2e/support/emulator.ts`): the Firebase SDK keys its persisted Auth entry as
// `firebase:authUser:<apiKey>:…`, so a different value makes the app miss the
// injected session and every E2E spec dies at the login gate (issue #284). The
// emulator's public fake key is therefore the fallback in emulator mode; the
// production key only ever applies outside it.
const EMULATOR_API_KEY = 'fake-api-key';
const PRODUCTION_API_KEY = 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo';
const useEmulator = import.meta.env.VITE_FIRESTORE_EMULATOR === 'true';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY || (useEmulator ? EMULATOR_API_KEY : PRODUCTION_API_KEY),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'one-piece-4e822.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'one-piece-4e822',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'one-piece-4e822.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '829742952504',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:829742952504:web:b393e78707ecd29ea276cd',
  measurementId: 'G-W7VDSG0XE9',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

if (useEmulator) {
  // Escape hatch for browsers that run inside the compose network and can resolve
  // the `firebase` service hostname themselves.
  const directHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string | undefined;

  if (directHost) {
    connectAuthEmulator(auth, `http://${directHost}:9099`);
  } else {
    // connectAuthEmulator discards any path in the URL ("Always replace path with
    // '/'" in the SDK), so the origin alone is correct: the SDK then requests
    // `<origin>/identitytoolkit.googleapis.com/...`, which the Vite proxy forwards.
    connectAuthEmulator(auth, window.location.origin);
  }
}

export const googleProvider = new GoogleAuthProvider();
export { app, auth, useEmulator };
