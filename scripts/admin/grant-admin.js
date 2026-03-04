import admin from 'firebase-admin';

/**
 * Grant admin role to a user by UID.
 * Usage: node grant-admin.js <uid>
 */

const uid = process.argv[2];

if (!uid) {
  console.error('\x1b[31mError: Missing UID.\x1b[0m');
  console.log('Usage: node grant-admin.js <uid>');
  process.exit(1);
}

try {
  admin.initializeApp();

  console.log(`Granting admin role to user: \x1b[36m${uid}\x1b[0m...`);

  await admin.auth().setCustomUserClaims(uid, {
    role: 'admin',
  });

  console.log(`Updating Firestore profile for \x1b[36m${uid}\x1b[0m...`);
  const db = admin.firestore();
  await db.collection('users').doc(uid).set({ role: 'admin' }, { merge: true });

  console.log('\x1b[32mSuccess: Admin role granted.\x1b[0m');
  console.log(
    'The user needs to re-login or refresh their ID token for the changes to take effect.',
  );

  process.exit(0);
} catch (error) {
  console.error('\x1b[31mError granting admin role:\x1b[0m', error.message);
  process.exit(1);
}
