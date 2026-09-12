import admin from 'firebase-admin';

import { applyEmulatorEnv } from './emulator-env';

// Resolve emulator targets from env vars (defaults to localhost) before SDK init.
const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: emulator.projectId,
  });
}

const db = admin.firestore();
const auth = admin.auth();

const QA_EMAIL = 'qa@onepiece.test';
const QA_PASSWORD = 'password123';
const QA_DISPLAY_NAME = 'QA Tester';
const QA_HOUSEHOLD_ID = 'qa_household';

const bootstrapAuth = async (): Promise<string> => {
  try {
    const user = await auth.getUserByEmail(QA_EMAIL);
    console.log(`Auth user exists: ${user.uid}`);
    return user.uid;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/user-not-found'
    ) {
      const user = await auth.createUser({
        email: QA_EMAIL,
        password: QA_PASSWORD,
        displayName: QA_DISPLAY_NAME,
        emailVerified: true,
      });
      console.log(`Auth user created: ${user.uid}`);
      return user.uid;
    }
    throw error;
  }
};

const seedWhitelist = async (): Promise<void> => {
  const whitelistRef = db.collection('access_control').doc('whitelist');
  const snap = await whitelistRef.get();
  const existing = snap.exists ? ((snap.data()?.emails as string[]) ?? []) : [];
  if (!existing.includes(QA_EMAIL)) {
    await whitelistRef.set({ emails: [...existing, QA_EMAIL] });
    console.log(`Whitelisted ${QA_EMAIL}`);
  } else {
    console.log(`Whitelist already contains ${QA_EMAIL}`);
  }
};

const seedHousehold = async (uid: string): Promise<void> => {
  const householdRef = db.collection('households').doc(QA_HOUSEHOLD_ID);
  const snap = await householdRef.get();
  if (snap.exists) {
    console.log(`Household exists: ${QA_HOUSEHOLD_ID}`);
    return;
  }

  const now = new Date();
  await householdRef.set({
    name: 'QA Family',
    memberUids: [uid],
    members: {
      [uid]: {
        role: 'owner',
        joinedAt: now,
      },
    },
    id: QA_HOUSEHOLD_ID,
    createdBy: uid,
    updatedBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Household created: ${QA_HOUSEHOLD_ID}`);
};

const seedUserProfile = async (uid: string): Promise<void> => {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (snap.exists) {
    await userRef.set({ householdId: QA_HOUSEHOLD_ID }, { merge: true });
    console.log(`User profile linked to ${QA_HOUSEHOLD_ID}`);
    return;
  }

  const now = new Date();
  await userRef.set({
    uid,
    email: QA_EMAIL,
    displayName: QA_DISPLAY_NAME,
    householdId: QA_HOUSEHOLD_ID,
    id: uid,
    createdBy: uid,
    updatedBy: uid,
    createdAt: now,
    updatedAt: now,
  });
  console.log('User profile created with household link');
};

const printSessionRecipe = async (uid: string): Promise<void> => {
  const url = `${emulator.authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: QA_EMAIL,
      password: QA_PASSWORD,
      returnSecureToken: true,
    }),
  });
  const data = (await response.json()) as { idToken?: string };
  if (!data.idToken) {
    console.log('Could not mint an idToken for the session recipe; sign in manually instead.');
    return;
  }

  const sessionUser = {
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
      accessToken: data.idToken,
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
    `localStorage.setItem('firebase:authUser:fake-api-key:[DEFAULT]', JSON.stringify(${JSON.stringify(sessionUser)}))`,
  );
  console.log('2. Reload the page. You will be signed in as qa@onepiece.test.');
  console.log('--------------------------------------------------');
};

const run = async () => {
  console.log('Bootstrapping emulator QA data...');
  const uid = await bootstrapAuth();
  await seedWhitelist();
  await seedHousehold(uid);
  await seedUserProfile(uid);
  await printSessionRecipe(uid);
  console.log('QA bootstrap complete.');
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('QA bootstrap failed:', error);
    process.exit(1);
  });
