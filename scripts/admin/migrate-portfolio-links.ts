/**
 * One-time migration: Portfolio docs from accountIds[] to named link fields.
 *
 * Maps old `accountIds: string[]` to `securitiesAccountId` + `bankAccountId`
 * per each account's category, using account category bank|cash for the bank
 * link (same rule as portfolioConstraints.ts). Also strips removed
 * `description` (spec 11 field list: name + links + system fields only).
 *
 * Usage: npx tsx scripts/admin/migrate-portfolio-links.ts [--dry-run]
 *
 * Prerequisite: emulator env (applyEmulatorEnv reads firebase_emulator config).
 */
import admin from 'firebase-admin';

import { applyEmulatorEnv } from '../shared/emulator-env';
import {
  AccountCategory,
  type AccountCategory as AccountCategoryType,
} from '../../src/domains/account/types/categories';

const dryRun = process.argv.includes('--dry-run');

const emulator = applyEmulatorEnv();

if (!admin.apps.length) {
  admin.initializeApp({ projectId: emulator.projectId });
}

const db = admin.firestore();

interface AccountDoc {
  category?: AccountCategoryType;
}

interface PortfolioDoc {
  accountIds?: string[];
  securitiesAccountId?: string;
  bankAccountId?: string;
  description?: string;
}

const migrate = async (): Promise<void> => {
  const accountSnaps = await db.collection('accounts').get();
  const categories = new Map<string, AccountCategoryType>();
  accountSnaps.forEach((snap) => {
    const data = snap.data() as AccountDoc;
    if (typeof data.category === 'string') {
      categories.set(snap.id, data.category as AccountCategoryType);
    }
  });

  const householdSnaps = await db.collection('households').get();
  let migrated = 0;
  let skipped = 0;

  for (const household of householdSnaps.docs) {
    const portfolioSnaps = await household.ref.collection('portfolios').get();

    for (const portfolio of portfolioSnaps.docs) {
      const data = portfolio.data() as PortfolioDoc;

      if (data.securitiesAccountId && data.bankAccountId) {
        skipped += 1;
        continue;
      }

      const accountIds = Array.isArray(data.accountIds) ? data.accountIds : [];
      const securities = accountIds.find((id) => categories.get(id) === AccountCategory.SECURITIES);
      const bank = accountIds.find((id) => {
        const category = categories.get(id);
        return category === AccountCategory.BANK || category === AccountCategory.CASH;
      });

      if (!securities || !bank) {
        console.warn(
          `[skip] ${portfolio.ref.path}: cannot resolve links from accountIds=[${accountIds.join(', ')}]`,
        );
        skipped += 1;
        continue;
      }

      const update: Record<string, unknown> = {
        securitiesAccountId: securities,
        bankAccountId: bank,
        description: admin.firestore.FieldValue.delete(),
        accountIds: admin.firestore.FieldValue.delete(),
      };

      if (dryRun) {
        console.log(`[dry-run] ${portfolio.ref.path}: securities=${securities} bank=${bank}`);
      } else {
        await portfolio.ref.update(update);
        console.log(`[migrated] ${portfolio.ref.path}: securities=${securities} bank=${bank}`);
      }
      migrated += 1;
    }
  }

  console.log(`Done: ${migrated} migrated, ${skipped} skipped${dryRun ? ' (dry-run)' : ''}.`);
};

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
