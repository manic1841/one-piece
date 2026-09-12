import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore } from 'firebase/firestore';
import { vi } from 'vitest';

import { authEmulator, emulatorProjectId, firestoreEmulator } from '../emulatorEnv';

const firebaseConfig = {
  apiKey: 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo',
  authDomain: 'one-piece-4e822.firebaseapp.com',
  projectId: emulatorProjectId,
  storageBucket: 'one-piece-4e822.firebasestorage.app',
  messagingSenderId: '829742952504',
  appId: '1:829742952504:web:b393e78707ecd29ea276cd',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const emulatorEndpoints = [
  { name: 'Firestore', url: firestoreEmulator.baseUrl },
  { name: 'Auth', url: authEmulator.baseUrl },
];

const EMULATOR_WAIT_TOTAL_MS = 15_000;
const EMULATOR_WAIT_INTERVAL_MS = 500;
const EMULATOR_PROBE_TIMEOUT_MS = 1_000;

export const assertEmulatorsAvailable = async (): Promise<void> => {
  const deadline = Date.now() + EMULATOR_WAIT_TOTAL_MS;

  for (;;) {
    const failures: string[] = [];

    for (const endpoint of emulatorEndpoints) {
      try {
        await fetch(endpoint.url, { signal: AbortSignal.timeout(EMULATOR_PROBE_TIMEOUT_MS) });
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : '';
        failures.push(`${endpoint.name} emulator unavailable${detail}`);
      }
    }

    if (failures.length === 0) return;

    if (Date.now() >= deadline) {
      throw new Error(
        `${failures.join('; ')} after waiting ${EMULATOR_WAIT_TOTAL_MS / 1000}s. ` +
          'Start the Firebase emulators before running integration tests.',
      );
    }

    await new Promise((resolve) => setTimeout(resolve, EMULATOR_WAIT_INTERVAL_MS));
  }
};

// Connect to Emulators
connectFirestoreEmulator(db, firestoreEmulator.host, firestoreEmulator.port);
connectAuthEmulator(auth, authEmulator.baseUrl);

// Mock @/firebase to return the emulator-connected instances
vi.mock('@/firebase', () => ({
  db,
  auth,
}));

// Provide a way to reset the DB for tests
export const resetMockDb = async () => {
  try {
    const response = await fetch(
      `${firestoreEmulator.baseUrl}/emulator/v1/projects/${emulatorProjectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    const detail = err instanceof Error ? `: ${err.message}` : '';
    throw new Error(
      `Failed to reset emulator DB${detail}. Start the Firestore emulator before running integration tests.`,
    );
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
