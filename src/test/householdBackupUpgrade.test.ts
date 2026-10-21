/**
 * Verification tests for the household backup upgrade transform (issue: live
 * backup upgrade).
 *
 * The fixture is the real live backup exported 2026-09-12 (v0 era). Expected
 * values are independent worked examples of the authoritative backup upgrade
 * rules, not restatements of the transform.
 *
 * The upgrade gate is the full-collection parse against the CURRENT schemas:
 * import writes raw docs, and read-time parsing (baseRepository) is what
 * poisons lists when a doc drifts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { upgradeHouseholdBackup } from '../../scripts/admin/upgrade-household-backup';
import { type HouseholdBackupPayload } from '../../src/application/household/use_cases/exportHouseholdBackupUseCase';
import { AccountSchema, AccountSnapshotSchema } from '../../src/domains/account/types/account';
import { AccountCategory } from '../../src/domains/account/types/categories';
import { AllocationSchema } from '../../src/domains/allocation/schemas';
import { AllocationTemplateSchema } from '../../src/domains/allocation/templateSchemas';
import { DebtAccountSchema, DebtSnapshotSchema } from '../../src/domains/debt/schemas';
import { HouseholdSchema } from '../../src/domains/household/schemas';
import {
  CustomLedgerCodeSchema,
  IntentMappingSchema,
  TransactionSchema,
} from '../../src/domains/ledger/schemas';
import { PortfolioSchema, PortfolioSnapshotSchema } from '../../src/domains/portfolio/schemas';
import { ProjectSchema, ProjectSnapshotSchema } from '../../src/domains/project/schemas';
import { FinancialReportSchema } from '../../src/domains/report/schemas';
import { createRetirementPlanCreateSchema } from '../../src/domains/retirement/planSchemas';

const BACKUP_PATH = 'examples/household-backup-6UpTVwd6O3vt0a8QDYJw-2026-09-12T07-57-08-648Z.json';

// The fixture is the real live backup: it stays out of the repo, so these
// tests only run where the file exists (dev box) and skip on CI.
const hasFixture = existsSync(BACKUP_PATH);

const loadBackup = (): HouseholdBackupPayload =>
  JSON.parse(readFileSync(BACKUP_PATH, 'utf8')) as HouseholdBackupPayload;

// Schemas parse the raw JSON as-is: persisted timestamps are ISO strings, and
// the shared TimestampSchema accepts them and revives them to Date (issue #281).
// There is no lexical revival step anywhere on the import path.
const expectAllParse = (
  label: string,
  schema: { parse: (value: unknown) => unknown },
  docs: unknown[],
): void => {
  docs.forEach((doc, index) => {
    try {
      schema.parse(doc);
    } catch (error) {
      throw new Error(`${label}[${index}] failed schema parse: ${(error as Error).message}`);
    }
  });
};

describe('upgradeHouseholdBackup', () => {
  it.skipIf(!hasFixture)('backfills household memberUids from members keys', () => {
    const upgraded = upgradeHouseholdBackup(loadBackup());
    const household = upgraded.household as Record<string, unknown>;

    expect(household.memberUids).toEqual(
      expect.arrayContaining(['rnSCoxeAl0bmc9NQeHSzFR5gYUB3', 'CLtPDm5TyHRH3VGNbm6rwftdIeH3']),
    );
    expect(household.memberUids).toHaveLength(2);
  });

  it.skipIf(!hasFixture)(
    'resolves portfolio accountIds into named links, keeping accountIds',
    () => {
      const backup = loadBackup();
      const upgraded = upgradeHouseholdBackup(backup);
      const categories = new Map<string, AccountCategory>();
      backup.collections.accounts.forEach(({ account }) => {
        const doc = account as Record<string, unknown>;
        categories.set(doc.id as string, doc.category as AccountCategory);
      });

      upgraded.collections.portfolios.forEach(({ portfolio }) => {
        const doc = portfolio as Record<string, unknown>;
        const accountIds = doc.accountIds as string[];
        const securities = accountIds.find(
          (id) => categories.get(id) === AccountCategory.SECURITIES,
        );
        const bank = accountIds.find((id) => {
          const category = categories.get(id);
          return category === AccountCategory.BANK || category === AccountCategory.CASH;
        });

        expect(doc.securitiesAccountId).toBe(securities);
        expect(doc.bankAccountId).toBe(bank);
        expect(doc.accountIds).toEqual(accountIds);
      });
    },
  );

  it.skipIf(!hasFixture)('emits the new-model retirement plan', () => {
    const upgraded = upgradeHouseholdBackup(loadBackup());
    const plan = upgraded.collections.retirementPlans[0] as Record<string, unknown>;

    expect(upgraded.collections.retirementPlans).toHaveLength(1);
    expect(plan.id).toBe('lGcR485GBAfcl8AWqJyN');
    expect(plan.name).toBe('偉大的航道');
    expect(plan.assumptions).toEqual({
      birthYear: 1995,
      retirementAge: 45,
      lifeExpectancy: 100,
      inflationRate: 0.02,
      annualReturnRate: 0.06,
    });
    // v0 flat amounts are not converted to rules (ADR-0089): the projection is
    // recomputed, so rules and events start empty.
    expect(plan).not.toHaveProperty('incomes');
    expect(plan).not.toHaveProperty('expenses');
    expect(plan).not.toHaveProperty('events');
  });

  it.skipIf(!hasFixture)('keeps every other collection byte-for-byte intact', () => {
    const backup = loadBackup();
    const upgraded = upgradeHouseholdBackup(backup);
    const c = backup.collections;
    const u = upgraded.collections;

    expect(u.accounts).toEqual(c.accounts);
    expect(u.projects).toEqual(c.projects);
    expect(u.debtAccounts).toEqual(c.debtAccounts);
    expect(u.transactions).toEqual(c.transactions);
    expect(u.reports).toEqual(c.reports);
    expect(u.allocations).toEqual(c.allocations);
    expect(u.allocationTemplates).toEqual(c.allocationTemplates);
    expect(u.ledgerCodes).toEqual(c.ledgerCodes);
    expect(u.intentMappings).toEqual(c.intentMappings);
    expect(u.accounts).toHaveLength(29);
    expect(u.transactions).toHaveLength(1272);
    expect(u.reports).toHaveLength(240);
  });

  it.skipIf(!hasFixture)('produces a payload that parses against every current schema', () => {
    const upgraded = upgradeHouseholdBackup(loadBackup());
    const c = upgraded.collections;

    expect(() => HouseholdSchema.parse(upgraded.household)).not.toThrow();
    expectAllParse(
      'accounts',
      AccountSchema,
      c.accounts.map((w) => w.account),
    );
    expectAllParse(
      'accountSnapshots',
      AccountSnapshotSchema,
      c.accounts.flatMap((w) => w.snapshots),
    );
    expectAllParse(
      'projects',
      ProjectSchema,
      c.projects.map((w) => w.project),
    );
    expectAllParse(
      'projectSnapshots',
      ProjectSnapshotSchema,
      c.projects.flatMap((w) => w.snapshots),
    );
    expectAllParse(
      'portfolios',
      PortfolioSchema,
      c.portfolios.map((w) => w.portfolio),
    );
    expectAllParse(
      'portfolioSnapshots',
      PortfolioSnapshotSchema,
      c.portfolios.flatMap((w) => w.snapshots),
    );
    expectAllParse(
      'debtAccounts',
      DebtAccountSchema,
      c.debtAccounts.map((w) => w.debtAccount),
    );
    expectAllParse(
      'debtSnapshots',
      DebtSnapshotSchema,
      c.debtAccounts.flatMap((w) => w.snapshots),
    );
    expectAllParse('transactions', TransactionSchema, c.transactions);
    expectAllParse('reports', FinancialReportSchema, c.reports);
    expectAllParse('allocations', AllocationSchema, c.allocations);
    expectAllParse('allocationTemplates', AllocationTemplateSchema, c.allocationTemplates);
    expectAllParse('ledgerCodes', CustomLedgerCodeSchema, c.ledgerCodes);
    expectAllParse('intentMappings', IntentMappingSchema, c.intentMappings);

    const plan = c.retirementPlans[0];
    expect(() => createRetirementPlanCreateSchema(2025).parse(plan)).not.toThrow();
  });

  it.skipIf(!hasFixture)(
    'rejects a backup whose retirement plans do not match the expected single plan',
    () => {
      const backup = loadBackup();
      const mutated = {
        ...backup,
        collections: {
          ...backup.collections,
          retirementPlans: [
            ...backup.collections.retirementPlans,
            ...backup.collections.retirementPlans,
          ],
        },
      };

      expect(() => upgradeHouseholdBackup(mutated)).toThrow(/exactly 1 retirement plan/);
    },
  );
});
