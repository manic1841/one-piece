import admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

const users = db.collection('users');

users.get().then((querySnapshot) => {
  querySnapshot.forEach((doc) => {
    console.log(doc.id, ' => ', doc.data());
  });
});
