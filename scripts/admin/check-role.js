import admin from 'firebase-admin';

/**
 * Check user role
 * Usage: node check-role.js <uid>
 */

const uid = process.argv[2];

if (!uid) {
  console.error('\x1b[31mError: Missing UID.\x1b[0m');
  console.log('Usage: node check-role.js <uid>');
  process.exit(1);
}

try {
  admin.initializeApp();

  const user = await admin.auth().getUser(uid);
  console.log(`User ${uid} role:`, user.customClaims);

  if (user.customClaims && user.customClaims.role === 'admin') {
    console.log('is admin');
  } else {
    console.log('is not admin');
  }

  process.exit(0);
} catch (error) {
  console.error('\x1b[31mError checking user role:\x1b[0m', error.message);
  process.exit(1);
}
