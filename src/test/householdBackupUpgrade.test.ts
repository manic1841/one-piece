/**
 * Verification tests for the household backup upgrade transform (issue: live
 * backup upgrade).
 *
 * The fixture is the real live backup exported 2026-09-12 (v0 era). Expected
 * values are independent worked examples of the authoritative
 * migrate-retirement-v1 rules, not restatements of the transform.
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
import {
  RetirementExpenseCategorySchema,
  RetirementIncomeSourceSchema,
  RetirementOneTimeEventSchema,
  RetirementPlanSchema,
} from '../../src/domains/retirement/schemas';

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

  it.skipIf(!hasFixture)('emits the hand-computed v1 retirement plan', () => {
    const upgraded = upgradeHouseholdBackup(loadBackup());
    const plan = upgraded.collections.retirementPlans[0] as Record<string, unknown>;

    expect(upgraded.collections.retirementPlans).toHaveLength(1);
    expect(plan.id).toBe('lGcR485GBAfcl8AWqJyN');
    expect(plan.name).toBe('偉大的航道');
    // v1 flat shape: no legacy mode/derived fields, no plan-level removed fields.
    expect(plan).not.toHaveProperty('currentSavings');
    expect(plan).not.toHaveProperty('salaryGrowthRate');
    expect(plan).not.toHaveProperty('retirementTransition');
    expect(plan).not.toHaveProperty('summary');

    const incomes = plan.incomes as Array<Record<string, unknown>>;
    const byName = Object.fromEntries(incomes.map((income) => [income.name, income]));
    // DERIVED flattening: round(base x 0.4).
    expect(byName['妹妹獎金'].currentAnnual).toBe(300692);
    expect(byName['哥哥獎金'].currentAnnual).toBe(375859);
    // IMPORTED incomes keep their base level.
    expect(byName['妹妹薪資'].currentAnnual).toBe(751731);
    expect(byName['哥哥薪資'].currentAnnual).toBe(939648);
    // Non-pension streams keep their level after retirement.
    incomes.forEach((income) => expect(income.retirementAnnual).toBe(income.currentAnnual));
    // No legacy mode fields survive.
    incomes.forEach((income) => {
      expect(income).not.toHaveProperty('baseAmount');
      expect(income).not.toHaveProperty('incomeCalculationMode');
      expect(income).not.toHaveProperty('derivedFrom');
      // calculatedFrom is dropped by the upgrade — it was removed when the old
      // import-side date revival (since deleted, issue #281) turned its
      // `importedAt` string into a Date — and the omission stays so this
      // transform's output is frozen.
      expect(income).not.toHaveProperty('calculatedFrom');
    });

    const expenses = plan.expenses as Array<Record<string, unknown>>;
    const expenseByName = Object.fromEntries(expenses.map((expense) => [expense.name, expense]));
    // SALARY_PERCENTAGE flattening: round(linked baseline x percentage), with
    // the all-salary baseline for 生活費.
    expect(expenseByName['汽車-妹妹'].currentAnnual).toBe(58559);
    expect(expenseByName['居住-妹妹'].currentAnnual).toBe(234234);
    expect(expenseByName['保險-妹妹'].currentAnnual).toBe(35135);
    expect(expenseByName['生活費'].currentAnnual).toBe(1106748);
    expect(expenseByName['汽車-哥哥'].currentAnnual).toBe(73197);
    expect(expenseByName['居住-哥哥'].currentAnnual).toBe(292788);
    expect(expenseByName['保險-哥哥'].currentAnnual).toBe(43918);
    expenses.forEach((expense) => {
      expect(expense).not.toHaveProperty('calculationMode');
      expect(expense).not.toHaveProperty('baseAmount');
      expect(expense).not.toHaveProperty('salaryPercentage');
      expect(expense).not.toHaveProperty('linkedIncomeId');
      expect(expense.retirementMultiplier).toBe(0.7);
    });

    const events = plan.events as Array<Record<string, unknown>>;
    const renovation = events.find((event) => event.name === '房屋裝修');
    expect(renovation).toMatchObject({ year: 2026, amount: 500000 });
    const child = events.find((event) => event.name === '小孩');
    expect(child).not.toHaveProperty('calculationMode');
    (child?.phases as Array<Record<string, unknown>>).forEach((phase) => {
      expect(phase).not.toHaveProperty('mode');
      expect(phase).not.toHaveProperty('percentage');
      expect(typeof phase.amount).toBe('number');
    });
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
    expect(() => RetirementPlanSchema.parse(plan)).not.toThrow();
    const planRecord = plan as Record<string, unknown>;
    (planRecord.incomes as unknown[]).forEach((income) =>
      expect(() => RetirementIncomeSourceSchema.parse(income)).not.toThrow(),
    );
    (planRecord.expenses as unknown[]).forEach((expense) =>
      expect(() => RetirementExpenseCategorySchema.parse(expense)).not.toThrow(),
    );
    (planRecord.events as unknown[]).forEach((event) =>
      expect(() => RetirementOneTimeEventSchema.parse(event)).not.toThrow(),
    );
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
