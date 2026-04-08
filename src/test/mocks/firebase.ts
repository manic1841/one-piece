import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore } from 'firebase/firestore';
import { vi } from 'vitest';

const firebaseConfig = {
  apiKey: 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo',
  authDomain: 'one-piece-4e822.firebaseapp.com',
  projectId: 'one-piece-4e822',
  storageBucket: 'one-piece-4e822.firebasestorage.app',
  messagingSenderId: '829742952504',
  appId: '1:829742952504:web:b393e78707ecd29ea276cd',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to Emulators
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099');

// Mock @/firebase to return the emulator-connected instances
vi.mock('@/firebase', () => ({
  db,
  auth,
}));

// Provide a way to reset the DB for tests
export const resetMockDb = async () => {
  // Clearing the emulator database can be done by deleting all collections.
  // For a more robust solution, we can use the emulator's clear data endpoint.
  const projectId = 'one-piece-4e822';
  try {
    await fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  } catch (err) {
    console.error('Failed to reset emulator DB:', err);
  }
};

// Compatibility export for tests that might still try to use mockDb directly
// Note: This is now a proxy or just a placeholder; tests should move to using real SDK calls or repositories.
export const mockDb: Record<string, unknown> = new Proxy(
  {},
  {
    set: (_target, path, value) => {
      // This is a bit of a hack to keep legacy tests working if they assign to mockDb.
      // However, since it's an async operation, it might not behave as expected in all tests.
      const segments = (path as string).split('/');
      const docRef = doc(db, segments[0], ...segments.slice(1));
      import('firebase/firestore').then(({ setDoc }) => setDoc(docRef, value));
      return true;
    },
    get: () => {
      // Returns undefined to signal it's not a real DB access point
      return undefined;
    },
  },
);
