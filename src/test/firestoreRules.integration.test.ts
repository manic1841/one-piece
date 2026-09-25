/**
 * Firestore security rules authorization matrix test.
 *
 * Uses the official @firebase/rules-unit-testing package to test rules
 * enforcement against the Firestore Emulator. Rules are loaded directly
 * from firestore.rules via initializeTestEnvironment, so the test does not
 * depend on the emulator container being started with a rules file.
 *
 * Test matrix:
 *   anonymous  – no auth token
 *   non-member – signed in, whitelisted, but NOT a household member
 *   member     – signed in, whitelisted, household member
 *   admin      – signed in, whitelisted, household admin
 *   owner      – signed in, whitelisted, household owner
 *   global     – signed in, global admin (role: 'admin')
 */
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { emulatorProjectId, firestoreEmulator } from './emulatorEnv';

const PROJECT_ID = emulatorProjectId;

const rulesPath = resolve(__dirname, '../../firestore.rules');
const rules = readFileSync(rulesPath, 'utf8');

let testEnv: RulesTestEnvironment;

const HOUSEHOLD_ID = 'household-rules-test';

/** Whitelisted emails (isSystemUser → isWhitelisted). */
const WHITELIST_EMAILS = [
  'member@test.com',
  'admin@test.com',
  'owner@test.com',
  'nonmember@test.com',
];

const HOUSEHOLD_DATA = {
  name: 'Test Household',
  members: {
    'member-uid': { role: 'member' },
    'admin-uid': { role: 'admin' },
    'owner-uid': { role: 'owner' },
  },
};

/** Token options for each test persona. */
const TOKENS = {
  nonMember: { email: 'nonmember@test.com' },
  member: { email: 'member@test.com' },
  admin: { email: 'admin@test.com' },
  owner: { email: 'owner@test.com' },
  globalAdmin: { email: 'globaladmin@test.com', role: 'admin' },
} as const;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: firestoreEmulator.host,
      port: firestoreEmulator.port,
      rules,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
  // Restore permissive rules so other integration tests are unaffected.
  // The Firestore emulator persists loaded rules across requests.
  await fetch(`${firestoreEmulator.baseUrl}/emulator/v1/projects/${PROJECT_ID}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rules: {
        files: [
          {
            content: [
              "rules_version = '2';",
              'service cloud.firestore {',
              '  match /databases/{database}/documents {',
              '    match /{document=**} {',
              '      allow read, write: if true;',
              '    }',
              '  }',
              '}',
            ].join('\n'),
          },
        ],
      },
    }),
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed data with rules bypassed (Admin-equivalent context)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'access_control/whitelist'), { emails: WHITELIST_EMAILS });
    await setDoc(doc(db, `households/${HOUSEHOLD_ID}`), HOUSEHOLD_DATA);
  });
});

describe('Firestore security rules authorization matrix', () => {
  describe('anonymous (no auth)', () => {
    it('denied read on household subcollections', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('denied write on household subcollections', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('denied write on watch list (anonymous)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`), {
          targetType: 'PROJECT',
          targetId: 'p1',
          name: '媽媽專案',
        }),
      );
    });

    it('denied read on watch list (anonymous)', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`)));
    });

    it('denied read on users collection', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'users/user1')));
    });

    it('denied read on access_control', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'access_control/whitelist')));
    });
  });

  describe('non-member (whitelisted, not in household)', () => {
    it('denied read on household subcollections (not a member)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('denied write on household subcollections (not an admin)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('denied write on watch list (not a member)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/LEDGER_CODE:expense:travel`), {
          targetType: 'LEDGER_CODE',
          targetId: 'expense:travel',
          name: '差旅費',
        }),
      );
    });

    it('denied read on watch list (not a member)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(getDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`)));
    });

    it('allowed read on household main doc (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}`)));
    });

    it('denied update on household main doc (not an admin of this household)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}`), { name: 'x' }, { merge: true }),
      );
    });

    it('allowed read on access_control (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertSucceeds(getDoc(doc(db, 'access_control/whitelist')));
    });

    it('denied write on access_control (not global admin)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(
        setDoc(doc(db, 'access_control/whitelist'), { emails: [] }, { merge: true }),
      );
    });

    it('allowed read on users (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertSucceeds(getDoc(doc(db, 'users/non-member-uid')));
    });

    it('denied write on users for other uid', async () => {
      const db = testEnv.authenticatedContext('non-member-uid', TOKENS.nonMember).firestore();
      await assertFails(setDoc(doc(db, 'users/someone-else'), { name: 'x' }));
    });
  });

  describe('household member', () => {
    it('allowed read on household subcollections (non-existent doc, no permission error)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('denied write on household subcollections (member is not admin)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('allowed read on watch list (household member)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`)));
    });

    it('denied write on watch list (member is not admin)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`), {
          targetType: 'PROJECT',
          targetId: 'p1',
          name: '媽媽專案',
        }),
      );
    });

    it('allowed read on household main doc', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}`)));
    });

    it('denied update on household main doc (member is not admin)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}`), { name: 'Hacked' }, { merge: true }),
      );
    });

    it('denied create on households (requires global admin)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(setDoc(doc(db, 'households/new-household'), { name: 'New' }));
    });

    it('allowed read on access_control (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(getDoc(doc(db, 'access_control/whitelist')));
    });

    it('denied write on access_control (not global admin)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(
        setDoc(doc(db, 'access_control/whitelist'), { emails: [] }, { merge: true }),
      );
    });

    it('allowed read on users (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(getDoc(doc(db, 'users/member-uid')));
    });

    it('allowed write on own user doc', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertSucceeds(setDoc(doc(db, 'users/member-uid'), { name: 'self' }));
    });

    it('denied write on other user doc', async () => {
      const db = testEnv.authenticatedContext('member-uid', TOKENS.member).firestore();
      await assertFails(setDoc(doc(db, 'users/admin-uid'), { name: 'hack' }));
    });
  });

  describe('household admin', () => {
    it('allowed read on household subcollections', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('allowed write on household subcollections', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('allowed write on watch list (household admin)', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`), {
          targetType: 'PROJECT',
          targetId: 'p1',
          name: '媽媽專案',
        }),
      );
    });

    it('allowed read on watch list (household admin)', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/PROJECT:p1`)));
    });

    it('allowed read on household main doc', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}`)));
    });

    it('allowed update on household main doc (isHouseholdAdmin)', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}`), { name: 'Updated' }, { merge: true }),
      );
    });

    it('allowed read on access_control (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertSucceeds(getDoc(doc(db, 'access_control/whitelist')));
    });

    it('denied write on access_control (not global admin)', async () => {
      const db = testEnv.authenticatedContext('admin-uid', TOKENS.admin).firestore();
      await assertFails(
        setDoc(doc(db, 'access_control/whitelist'), { emails: [] }, { merge: true }),
      );
    });
  });

  describe('household owner', () => {
    it('allowed read on household subcollections', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('allowed write on household subcollections', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('allowed write on watch list (household owner)', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/watchList/DEBT_ACCOUNT:d1`), {
          targetType: 'DEBT_ACCOUNT',
          targetId: 'd1',
          name: '房貸',
        }),
      );
    });

    it('allowed read on household main doc', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}`)));
    });

    it('allowed update on household main doc (isHouseholdAdmin)', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}`), { name: 'Updated' }, { merge: true }),
      );
    });

    it('allowed read on access_control (isSystemUser)', async () => {
      const db = testEnv.authenticatedContext('owner-uid', TOKENS.owner).firestore();
      await assertSucceeds(getDoc(doc(db, 'access_control/whitelist')));
    });
  });

  describe('global admin (role: admin)', () => {
    it('allowed read on household subcollections', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`)));
    });

    it('allowed write on household subcollections', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(
        setDoc(doc(db, `households/${HOUSEHOLD_ID}/transactions/tx1`), { name: 'x' }),
      );
    });

    it('allowed read on household main doc', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(getDoc(doc(db, `households/${HOUSEHOLD_ID}`)));
    });

    it('allowed create on households', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(setDoc(doc(db, 'households/new-household'), { name: 'New' }));
    });

    it('allowed read on access_control', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(getDoc(doc(db, 'access_control/whitelist')));
    });

    it('allowed write on access_control', async () => {
      const db = testEnv.authenticatedContext('g-admin', TOKENS.globalAdmin).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'access_control/whitelist'), { emails: [] }, { merge: true }),
      );
    });
  });
});
