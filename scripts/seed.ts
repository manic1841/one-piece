import * as admin from 'firebase-admin';

// Local definitions to avoid TS path alias issues when running via ts-node
const COLLECTIONS = {
  TRANSACTIONS: 'v2_transactions',
  ALLOCATIONS: 'v2_allocations',
  PROJECTS: 'v2_projects',
  LEDGER_CODES: 'v2_ledgerCodes',
  PROJECT_SNAPSHOTS: 'v2_projectSnapshots',
  HOUSEHOLD: 'v2_household',
} as const;

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const runSeed = async () => {
  console.log('Starting seed phase 1...');

  // 1. Create Household
  const householdRef = db.collection(COLLECTIONS.HOUSEHOLD).doc('family_01');
  await householdRef.set({
    name: 'My Family',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Household created: family_01');

  // 2. Default Projects (10 projects)
  const defaultProjects = [
    { id: 'proj_living', name: '生活開銷', category: 'expense', order: 1, icon: '🛒', color: '#ff7675' },
    { id: 'proj_housing', name: '居住支出', category: 'expense', order: 2, icon: '🏠', color: '#74b9ff' },
    { id: 'proj_transport', name: '交通出行', category: 'expense', order: 3, icon: '🚗', color: '#55efc4' },
    { id: 'proj_food', name: '餐飲', category: 'expense', order: 4, icon: '🍔', color: '#fdcb6e' },
    { id: 'proj_shopping', name: '購物', category: 'expense', order: 5, icon: '🛍️', color: '#a29bfe' },
    { id: 'proj_entertainment', name: '娛樂', category: 'expense', order: 6, icon: '🎮', color: '#e84393' },
    { id: 'proj_healthcare', name: '醫療', category: 'expense', order: 7, icon: '🏥', color: '#00cec9' },
    { id: 'proj_education', name: '教育', category: 'expense', order: 8, icon: '📚', color: '#0984e3' },
    { id: 'proj_insurance', name: '保險', category: 'expense', order: 9, icon: '🛡️', color: '#fd79a8' },
    { id: 'proj_parents', name: '孝親', category: 'expense', order: 10, icon: '👴', color: '#b2bec3' },
  ];

  for (const p of defaultProjects) {
    await db.collection(COLLECTIONS.PROJECTS).doc(p.id).set({
      name: p.name,
      category: p.category,
      order: p.order,
      icon: p.icon,
      color: p.color,
      isActive: true,
    });
  }
  console.log('10 Default Projects created.');

  // 3. 1 INCOME transaction + Allocation
  const incomeTxnId = 'txn_income_01';
  const allocId = 'alloc_01';
  const now = new Date();

  await db.collection(COLLECTIONS.TRANSACTIONS).doc(incomeTxnId).set({
    date: now,
    intentType: 'INCOME',
    description: '三月薪水',
    projectId: null,
    allocationId: allocId,
    createdBy: 'system',
    entries: [
      { ledgerCode: 'asset:cash', debit: 50000, credit: 0 },
      { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
    ],
    ledgerCodes: ['asset:cash', 'income:salary'], // Denormalization index
  });

  await db.collection(COLLECTIONS.ALLOCATIONS).doc(allocId).set({
    date: now,
    description: '三月薪水分配',
    sourceTransactionId: incomeTxnId,
    totalAmount: 50000,
    createdBy: 'system',
    items: [
      { projectId: 'proj_living', percentage: 40, amount: 20000 },
      { projectId: 'proj_housing', percentage: 40, amount: 20000 },
      { projectId: 'proj_food', percentage: 20, amount: 10000 },
    ],
    projectIds: ['proj_living', 'proj_housing', 'proj_food'], // Denormalization index
  });
  console.log('1 Income Transaction + Allocation created.');

  // 4. 3 EXPENSE transactions (different projectId)
  const expenses = [
    {
      id: 'txn_expense_01',
      projectId: 'proj_food',
      amount: 150,
      description: '晚餐',
      ledger: 'expense:food',
    },
    {
      id: 'txn_expense_02',
      projectId: 'proj_transport',
      amount: 30,
      description: '捷運',
      ledger: 'expense:transport',
    },
    {
      id: 'txn_expense_03',
      projectId: 'proj_shopping',
      amount: 1200,
      description: '買鞋',
      ledger: 'expense:shopping',
    },
  ];

  for (const ex of expenses) {
    await db.collection(COLLECTIONS.TRANSACTIONS).doc(ex.id).set({
      date: now,
      intentType: 'EXPENSE',
      description: ex.description,
      projectId: ex.projectId,
      allocationId: null,
      createdBy: 'system',
      entries: [
        { ledgerCode: ex.ledger, debit: ex.amount, credit: 0 },
        { ledgerCode: 'asset:cash', debit: 0, credit: ex.amount },
      ],
      ledgerCodes: [ex.ledger, 'asset:cash'], // Denormalization index
    });
  }
  console.log('3 Expense Transactions created.');

  console.log('Seed Phase 1 completed successfully!');
};

runSeed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
