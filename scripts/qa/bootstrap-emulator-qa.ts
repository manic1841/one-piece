/**
 * QA emulator bootstrap (qa:init).
 *
 * Creates the QA auth user, whitelist entry, household, and user profile
 * on the Firebase emulator, and prints the browser localStorage session
 * recipe. Idempotent: existing data is skipped or relinked.
 */
import admin from 'firebase-admin';

import { applyEmulatorEnv } from '../shared/emulator-env';
import { QA_DISPLAY_NAME, QA_EMAIL, QA_HOUSEHOLD_ID, QA_PASSWORD } from './qa-identity';

// Resolve emulator targets from env vars (defaults to localhost) before SDK init.
const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: emulator.projectId,
  });
}

const db = admin.firestore();
const auth = admin.auth();

const bootstrapAuth = async (): Promise<string> => {
  try {
    const user = await auth.getUserByEmail(QA_EMAIL);
    console.log(`Auth user exists: ${user.uid}`);
    return user.uid;
  } catch {
    const user = await auth.createUser({
      email: QA_EMAIL,
      password: QA_PASSWORD,
      displayName: QA_DISPLAY_NAME,
    });
    console.log(`Auth user created: ${user.uid}`);
    return user.uid;
  }
};

const ensureWhitelist = async (): Promise<void> => {
  const whitelistRef = db.collection('system').doc('whitelist');
  const snap = await whitelistRef.get();
  const emails = (snap.data()?.emails as string[] | undefined) ?? [];
  if (emails.includes(QA_EMAIL)) {
    console.log('Whitelist already contains qa@onepiece.test');
    return;
  }
  await whitelistRef.set({ emails: [...emails, QA_EMAIL] }, { merge: true });
  console.log('Whitelist updated with qa@onepiece.test');
};

const ensureHousehold = async (uid: string): Promise<void> => {
  const householdRef = db.collection('households').doc(QA_HOUSEHOLD_ID);
  const snap = await householdRef.get();
  if (!snap.exists) {
    await householdRef.set({
      name: 'QA Family',
      memberUids: [uid],
      memberEmails: [QA_EMAIL],
      createdAt: new Date(),
      createdBy: uid,
    });
    console.log(`Household created: ${QA_HOUSEHOLD_ID}`);
    return;
  }
  const data = snap.data() as { memberUids?: string[] } | undefined;
  if (data?.memberUids?.includes(uid)) {
    console.log(`Household exists: ${QA_HOUSEHOLD_ID}`);
    return;
  }
  await householdRef.set({ memberUids: [uid] }, { merge: true });
  console.log(`Household relinked to uid: ${QA_HOUSEHOLD_ID}`);
};

const ensureUserProfile = async (uid: string): Promise<void> => {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (snap.exists) {
    const data = snap.data() as { householdId?: string } | undefined;
    if (data?.householdId === QA_HOUSEHOLD_ID) {
      console.log('User profile linked to qa_household');
      return;
    }
  }
  await userRef.set(
    {
      email: QA_EMAIL,
      displayName: QA_DISPLAY_NAME,
      householdId: QA_HOUSEHOLD_ID,
      updatedAt: new Date(),
    },
    { merge: true },
  );
  console.log('User profile linked to qa_household');
};

const printSessionRecipe = (uid: string): void => {
  const session = {
    uid,
    email: QA_EMAIL,
    emailVerified: true,
    displayName: QA_DISPLAY_NAME,
    isAnonymous: false,
    providerData: [
      {
        providerId: 'password',
        uid: QA_EMAIL,
        displayName: QA_DISPLAY_NAME,
        email: QA_EMAIL,
        photoUrl: null,
      },
    ],
    stsTokenManager: {
      refreshToken: 'emulator-refresh-token',
      accessToken: 'emulator-access-token',
      expirationTime: Date.now() + 60 * 60 * 1000,
    },
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    apiKey: 'fake-api-key',
    appName: '[DEFAULT]',
  };
  console.log('--------------------------------------------------');
  console.log('Browser session recipe (skip Google popup):');
  console.log('1. Open the app, then in DevTools console run:');
  console.log(
    `localStorage.setItem('firebase:authUser:fake-api-key:[DEFAULT]', JSON.stringify(${JSON.stringify(
      session,
    )}))`,
  );
  console.log('2. Reload the page. You will be signed in as qa@onepiece.test.');
  console.log('--------------------------------------------------');
};

const run = async (): Promise<void> => {
  console.log('Bootstrapping emulator QA data...');
  const uid = await bootstrapAuth();
  await ensureWhitelist();
  await ensureHousehold(uid);
  await ensureUserProfile(uid);
  printSessionRecipe(uid);
  console.log('QA bootstrap complete.');
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('QA bootstrap failed:', error);
    process.exit(1);
  });
