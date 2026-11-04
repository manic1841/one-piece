import { describe, expect, it } from 'vitest';
import { type z } from 'zod';

import { HouseholdBackupPayloadSchema } from './backupSchema';

/**
 * The backup file is JSON, so every timestamp in it is an ISO string even
 * though the same field holds a Date in memory. These tests pin the contract
 * that validation itself revives those strings (issue #281): a payload that has
 * been through JSON.parse(JSON.stringify(...)) must parse, and its parsed
 * output must carry Date objects — that output is what the import writes.
 *
 * Fields that are genuinely strings (e.g. an import's `importedAt`) must come
 * out untouched; reviving them was the second half of the same bug.
 */
type FilePayload = z.input<typeof HouseholdBackupPayloadSchema>;

const T0 = new Date('2026-06-15T08:00:00.000Z');
const T1 = new Date('2026-07-01T00:00:00.000Z');

const baseFields = (id: string) => ({
  id,
  createdBy: 'u1',
  createdAt: T0,
  updatedBy: 'u1',
  updatedAt: T1,
});

const base = baseFields('h1');

const payload = {
  schemaVersion: 2,
  exportedAt: '2026-07-02T00:00:00.000Z',
  householdId: 'h1',
  household: {
    ...base,
    name: '測試家庭',
    memberUids: ['u1'],
    members: { u1: { role: 'owner', joinedAt: T0 } },
  },
  collections: {
    accounts: [
      {
        account: {
          ...baseFields('acc1'),
          name: '現金',
          category: 'cash',
          currency: 'TWD',
        },
        snapshots: [
          {
            ...baseFields('acc1_2026-06'),
            accountId: 'acc1',
            year: 2026,
            month: 6,
            amount: 1000,
          },
        ],
      },
    ],
    projects: [
      {
        project: { ...baseFields('proj1'), name: '旅遊基金', order: 0 },
        snapshots: [
          {
            ...baseFields('proj1_2026-06'),
            year: 2026,
            month: 6,
            openingBalance: 0,
            income: 0,
            expense: 250,
            closingBalance: -250,
          },
        ],
      },
    ],
    portfolios: [
      {
        portfolio: {
          ...baseFields('port1'),
          name: '投資組合',
          securitiesAccountId: 'acc2',
          bankAccountId: 'acc1',
        },
        snapshots: [
          {
            ...baseFields('port1_2026-06'),
            year: 2026,
            month: 6,
            accounts: [],
            totalValue: 0,
            cashFlow: { deposits: 0, withdrawals: 0 },
            performance: {
              openingValue: 0,
              closingValue: 0,
              netCashFlow: 0,
              gain: 0,
              returnRate: 0,
              cumulativeGain: 0,
              cumulativeReturnRate: 0,
            },
          },
        ],
      },
    ],
    debtAccounts: [
      {
        debtAccount: {
          ...baseFields('debt1'),
          name: '房貸',
          type: 'mortgage',
          originalAmount: 1000000,
          currentBalance: 900000,
          interestRate: 2.1,
          startDate: T0,
          endDate: T1,
          graceEndDate: T1,
          monthlyPayment: 30000,
          linkedLedgerCode: 'liability:mortgage',
          closedAt: T1,
        },
        snapshots: [
          {
            ...baseFields('debt1_2026-06'),
            yearMonth: '2026-06',
            openingBalance: 900000,
            principalPaid: 0,
            interestPaid: 0,
            totalPaid: 0,
            closingBalance: 900000,
          },
        ],
      },
    ],
    retirementPlans: [
      {
        ...baseFields('plan1'),
        name: '退休計畫',
        assumptions: {
          birthYear: 1990,
          retirementAge: 65,
          lifeExpectancy: 90,
          inflationRate: 0.02,
          annualReturnRate: 0.05,
        },
        projectionRules: [],
        lifeEvents: [],
      },
    ],
    projections: [
      {
        projection: {
          id: 'projection1',
          name: '基準情境',
          engineVersion: 3,
          retirementNetWorth: 100,
          finalNetWorth: 200,
          minNetWorth: 50,
          minNetWorthYear: 2050,
          bankruptcyYear: null,
          isBankrupt: false,
          createdBy: 'u1',
          createdAt: T0,
        },
        config: { startYear: 2026, note: 'kept verbatim' },
        source: { ruleSources: [] },
        annual: { years: [] },
      },
    ],
    transactions: [
      {
        ...baseFields('tx1'),
        date: T0,
        createdBy: 'u1',
        entries: [{ ledgerCode: 'expense:travel', debit: 250, credit: 0 }],
      },
    ],
    reports: [
      {
        ...baseFields('rep1'),
        householdId: 'h1',
        yearMonth: '2026-06',
        type: 'INCOME_STATEMENT',
        data: {
          yearMonth: '2026-06',
          incomeTotal: 0,
          expenseTotal: 250,
          netIncome: -250,
          incomeItems: [],
          expenseItems: [],
        },
      },
    ],
    allocations: [
      {
        ...baseFields('alloc1'),
        date: T0,
        yearMonth: '2026-06',
        sourceTransactionId: 'tx1',
        totalAmount: 250,
        createdBy: 'u1',
        items: [{ projectId: 'proj1', percentage: 100, amount: 250 }],
        projectIds: ['proj1'],
      },
    ],
    allocationTemplates: [
      {
        ...baseFields('tpl1'),
        name: '預設分配',
        ledgerCode: 'expense:travel',
        items: [{ projectId: 'proj1', percentage: 100 }],
        createdBy: 'u1',
      },
    ],
    ledgerCodes: [
      {
        ...baseFields('lc1'),
        code: 'expense:travel',
        label: '旅遊',
        type: 'expense',
        isCustom: true,
        createdBy: 'u1',
      },
    ],
    intentMappings: [
      {
        ...baseFields('im1'),
        intent: 'travel',
        debitLedgerCode: 'expense:travel',
        creditLedgerCode: 'asset:cash',
      },
    ],
    financialPeriods: [
      {
        ...baseFields('2026-06'),
        yearMonth: '2026-06',
        status: 'CLOSED',
        stages: {
          ACCOUNT_BALANCE: {
            status: 'COMPLETED',
            confirmedAt: T1,
            confirmedBy: 'u1',
          },
        },
      },
    ],
  },
} satisfies FilePayload;

/** The bytes a browser download produces, re-read as the import receives them. */
const asFileContents = (): FilePayload => JSON.parse(JSON.stringify(payload)) as FilePayload;

describe('HouseholdBackupPayloadSchema', () => {
  it('accepts the JSON file form and revives every timestamp to a Date', () => {
    const parsed = HouseholdBackupPayloadSchema.parse(asFileContents());

    expect(parsed.household.createdAt).toBeInstanceOf(Date);
    expect(parsed.household.members.u1.joinedAt).toBeInstanceOf(Date);
    expect(parsed.collections.accounts[0].account.createdAt).toBeInstanceOf(Date);
    expect(parsed.collections.accounts[0].snapshots[0].updatedAt).toBeInstanceOf(Date);
    expect(parsed.collections.projects[0].project.createdAt).toBeInstanceOf(Date);
    expect(parsed.collections.portfolios[0].portfolio.createdAt).toBeInstanceOf(Date);
    expect(parsed.collections.debtAccounts[0].debtAccount.startDate).toBeInstanceOf(Date);
    expect(parsed.collections.debtAccounts[0].debtAccount.graceEndDate).toBeInstanceOf(Date);
    expect(parsed.collections.debtAccounts[0].debtAccount.closedAt).toBeInstanceOf(Date);
    expect(parsed.collections.projections[0].projection.createdAt).toBeInstanceOf(Date);
    expect(parsed.collections.transactions[0].date).toBeInstanceOf(Date);
    expect(parsed.collections.reports[0].createdAt).toBeInstanceOf(Date);
    expect(parsed.collections.allocations[0].date).toBeInstanceOf(Date);
    expect(
      parsed.collections.financialPeriods?.[0].stages.ACCOUNT_BALANCE.confirmedAt,
    ).toBeInstanceOf(Date);
  });

  it('preserves the instant across the JSON round trip', () => {
    const parsed = HouseholdBackupPayloadSchema.parse(asFileContents());

    expect(parsed.household.createdAt?.toISOString()).toBe(T0.toISOString());
    expect(parsed.collections.transactions[0].date.toISOString()).toBe(T0.toISOString());
  });

  it('passes retirement plans and projection children through untouched', () => {
    const parsed = HouseholdBackupPayloadSchema.parse(asFileContents());

    // Plans are `unknown[]`: the restore side revives their audit timestamps.
    const plan = parsed.collections.retirementPlans[0] as Record<string, unknown>;
    expect(plan.createdAt).toBe('2026-06-15T08:00:00.000Z');
    expect(parsed.collections.projections[0].config).toEqual({
      startYear: 2026,
      note: 'kept verbatim',
    });
  });

  it('rejects a schemaVersion 1 payload', () => {
    const result = HouseholdBackupPayloadSchema.safeParse({
      ...asFileContents(),
      schemaVersion: 1,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a projection bundle missing one of the fixed child keys', () => {
    const file = asFileContents();
    const bundle = file.collections.projections[0] as Record<string, unknown>;
    delete bundle.annual;

    const result = HouseholdBackupPayloadSchema.safeParse(file);

    expect(result.success).toBe(false);
  });

  it('rejects a timestamp without a zone designator', () => {
    const file = asFileContents();
    (file.household.members.u1 as { joinedAt: unknown }).joinedAt = '2026-06-15T08:00:00';
    (file.household as Record<string, unknown>).createdAt = '2026-06-15';

    const result = HouseholdBackupPayloadSchema.safeParse(file);

    expect(result.success).toBe(false);
  });
});
