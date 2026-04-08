import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'demo-project', // 對應 Emulator 的 projectId
});

const db = admin.firestore();
db.settings({ host: 'localhost:8080', ssl: false });

async function seed() {
  const users = [
    { id: 'alice', name: 'Alice', age: 25 },
    { id: 'bob', name: 'Bob', age: 30 },
  ];

  const accounts = [
    { id: 'bank1', owner: 'alice', balance: 1000 },
    { id: 'bank2', owner: 'bob', balance: 2000 },
  ];

  for (const u of users) {
    await db.collection('users').doc(u.id).set(u);
  }

  for (const a of accounts) {
    await db.collection('accounts').doc(a.id).set(a);
  }

  console.log('Seed complete!');
}

seed().catch(console.error);
