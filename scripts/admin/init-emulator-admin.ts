import admin from 'firebase-admin';

import { applyEmulatorEnv } from '../shared/emulator-env';

// Resolve emulator targets from env vars (defaults to localhost) before SDK init.
const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: emulator.projectId,
  });
}

const runInit = async () => {
  const email = 'admin@test.com';
  const password = 'password123';
  const displayName = 'Super Admin';

  console.log(`Checking if user ${email} exists...`);
  let user: admin.auth.UserRecord;

  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`User already exists with UID: ${user.uid}`);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/user-not-found'
    ) {
      console.log('Creating new admin user...');
      user = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log(`User created successfully with UID: ${user.uid}`);
    } else {
      throw error;
    }
  }

  console.log(`Setting custom claims { role: 'admin' }...`);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

  console.log('Admin user initialization complete!');
  console.log('--------------------------------------------------');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`UID:      ${user.uid}`);
  console.log('--------------------------------------------------');
};

runInit()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error during init:', e);
    process.exit(1);
  });
