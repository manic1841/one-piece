/**
 * QA data seeder.
 *
 * Writes the deterministic QA financial dataset built by the plan builders
 * (scripts/qa/plan) to the Firestore emulator. Idempotent: fixed doc IDs
 * make re-runs converge to the same state (upserts, not appends).
 *
 * Boundary: depends on firebase-admin for I/O and on src/domains for
 * schema validation via the pure plan builders. The builders have no
 * firebase imports.
 *
 * Prerequisite: run `pnpm qa:init` first so the QA auth user, whitelist,
 * household, and user profile exist.
 */
import admin from 'firebase-admin';

import { applyEmulatorEnv } from '../shared/emulator-env';
import { type SeedDoc, buildQaSeedPlan } from './plan';
import { QA_EMAIL, QA_HOUSEHOLD_ID } from './qa-identity';

const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({ projectId: emulator.projectId });
}

const db = admin.firestore();
// The seed plan intentionally carries explicit undefined values for optional
// schema fields (e.g. incomeCategory); batch.set rejects them unless the
// Firestore instance is configured to ignore undefined.
db.settings({ ignoreUndefinedProperties: true });

const assertQaInitRan = async (): Promise<string> => {
  const householdSnap = await db.collection('households').doc(QA_HOUSEHOLD_ID).get();
  if (!householdSnap.exists) {
    console.error(`Household ${QA_HOUSEHOLD_ID} not found.`);
    console.error('Run `pnpm qa:init` first to create the QA auth user and household.');
    process.exit(1);
  }

  // qa:init stores the QA uid on the household members map.
  const data = householdSnap.data() as { memberUids?: string[] } | undefined;
  const uid = data?.memberUids?.[0];
  if (!uid) {
    console.error(`Household ${QA_HOUSEHOLD_ID} has no memberUids. Re-run \`pnpm qa:init\`.`);
    process.exit(1);
  }
  return uid;
};

// Recursively convert JS Date instances to Firestore Timestamps so the
// admin SDK accepts them. Plan builders emit Dates (zod schema contracts);
// admin SDK rejects raw Dates in nested objects.
const convertDatesToTimestamps = (value: unknown): unknown => {
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map(convertDatesToTimestamps);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = convertDatesToTimestamps(val);
    return out;
  }
  return value;
};

// Resolve a SeedDoc to its Firestore DocumentReference. collectionPath always
// ends on a collection segment (e.g. "households/qa_household/projects"), so
// pairs of (doc, collection) segments are walked and doc.id is the leaf.
const resolveDocRef = (doc: SeedDoc): admin.firestore.DocumentReference => {
  const segments = doc.collectionPath.split('/');
  // segments: [householdRoot, householdId, (collection, docId)*, finalCollection]
  let ref: admin.firestore.DocumentReference = db.collection(segments[0]).doc(segments[1]);
  const pairs = segments.slice(2, -1); // drop the trailing collection name
  for (let i = 0; i < pairs.length; i += 2) {
    ref = ref.collection(pairs[i]).doc(pairs[i + 1]);
  }
  return ref.collection(segments[segments.length - 1]).doc(doc.id);
};

const run = async () => {
  console.log('Seeding QA financial data...');
  const uid = await assertQaInitRan();
  const docs = buildQaSeedPlan({ uid, email: QA_EMAIL, householdId: QA_HOUSEHOLD_ID });
  console.log(`Plan built: ${docs.length} documents.`);

  // Batch in groups of 400 (Firestore batch limit is 500).
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) {
      const payload = convertDatesToTimestamps(doc.data) as admin.firestore.DocumentData;
      batch.set(resolveDocRef(doc), payload, { merge: true });
    }
    await batch.commit();
    console.log(`  written: ${Math.min(i + 400, docs.length)}/${docs.length}`);
  }

  console.log('QA financial data seed complete.');
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('QA seed failed:', error);
    process.exit(1);
  });
