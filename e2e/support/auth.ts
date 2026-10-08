import type { Page } from '@playwright/test';

import { APP_API_KEY, type EmulatorSession } from './emulator';

const DISPLAY_NAME = 'QA Tester';

/**
 * Firebase Auth's persisted user record. Shape matches what the SDK writes and
 * what `qa:init` prints as the browser recipe.
 */
interface AuthUserRecord {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  isAnonymous: boolean;
  providerData: {
    providerId: string;
    uid: string;
    displayName: string;
    email: string;
    photoUrl: null;
  }[];
  stsTokenManager: {
    refreshToken: string;
    accessToken: string;
    expirationTime: number;
  };
  createdAt: string;
  lastLoginAt: string;
  apiKey: string;
  appName: string;
}

export const firebaseStorageKey = (apiKey: string = APP_API_KEY): string =>
  `firebase:authUser:${apiKey}:[DEFAULT]`;

export const buildAuthUserRecord = (session: EmulatorSession): AuthUserRecord => {
  const now = Date.now();
  return {
    uid: session.localId,
    email: session.email,
    emailVerified: true,
    displayName: DISPLAY_NAME,
    isAnonymous: false,
    providerData: [
      {
        providerId: 'password',
        uid: session.email,
        displayName: DISPLAY_NAME,
        email: session.email,
        photoUrl: null,
      },
    ],
    stsTokenManager: {
      refreshToken: session.refreshToken,
      accessToken: session.idToken,
      expirationTime: now + Number(session.expiresIn) * 1000,
    },
    createdAt: String(now),
    lastLoginAt: String(now),
    apiKey: APP_API_KEY,
    appName: '[DEFAULT]',
  };
};

/**
 * Persist an emulator session into the app origin's storage, awaiting the
 * IndexedDB write before returning so the next navigation sees it.
 *
 * The Firebase Auth SDK v12 treats IndexedDB as the primary store and
 * localStorage as a fallback, so both are written. This is the one place that
 * knows the SDK's storage layout: if the SDK changes it, the failure surfaces
 * here (and in CI) rather than scattered across specs.
 *
 * The caller navigates to the app afterwards (`page.goto('/')`).
 */
export const installEmulatorSession = async (
  page: Page,
  session: EmulatorSession,
): Promise<void> => {
  const record = buildAuthUserRecord(session);
  const storageKey = firebaseStorageKey(record.apiKey);

  // Any same-origin page gives the page access to localStorage/IndexedDB.
  await page.goto('/login');

  await page.evaluate(
    async ({ key, userRecord }) => {
      window.localStorage.setItem(key, JSON.stringify(userRecord));

      const openStore = (version?: number): Promise<IDBDatabase> =>
        new Promise((resolve, reject) => {
          const request = version
            ? window.indexedDB.open('firebaseLocalStorageDb', version)
            : window.indexedDB.open('firebaseLocalStorageDb');
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
              db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

      let db = await openStore();
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        const nextVersion = db.version + 1;
        db.close();
        db = await openStore(nextVersion);
      }

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('firebaseLocalStorage', 'readwrite');
        tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: userRecord });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
    { key: storageKey, userRecord: record },
  );
};
