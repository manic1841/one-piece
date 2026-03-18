import admin from 'firebase-admin';

// Connect to Emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-project',
  });
}

const db = admin.firestore();

const runInit = async () => {
  const email = 'admin@test.com';
  const password = 'password123';
  const displayName = 'Super Admin';

  console.log(`Checking if user ${email} exists...`);
  let user: admin.auth.UserRecord;

  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`User already exists with UID: ${user.uid}`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
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
