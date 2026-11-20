import { describe, expect, it } from 'vitest';

import { type TransactionFormOutput } from '../types/transaction';
import {
  TransactionAdvancedFormSchema,
  TransactionExpenseFormSchema,
  TransactionIncomeFormSchema,
  createTransactionAdvancedFormValues,
  createTransactionExpenseFormValues,
  createTransactionIncomeFormValues,
} from './transactionForm.vm';

const expenseValues = (overrides: Record<string, unknown> = {}) => ({
  amount: '1200',
  date: '2026-03-26',
  projectId: '',
  intent: 'FOOD',
  ledgerCode: '',
  description: '',
  allocationItems: [],
  ...overrides,
});

describe('transactionForm.vm', () => {
  it('coerces the expense field values into the numeric payload', () => {
    const output = TransactionExpenseFormSchema.parse(
      expenseValues({
        projectId: 'project-1',
        intent: 'FOOD',
        ledgerCode: 'expense:food',
        description: 'Lunch',
      }),
    );

    expect(output).toEqual<TransactionFormOutput>({
      intentType: 'EXPENSE',
      intent: 'FOOD',
      date: '2026-03-26',
      amount: 1200,
      projectId: 'project-1',
      ledgerCode: 'expense:food',
      description: 'Lunch',
      triggerAllocation: false,
      allocationItems: undefined,
      allocationDirection: undefined,
    });
  });

  it('turns blank optional text into missing instead of empty strings', () => {
    const output = TransactionExpenseFormSchema.parse(expenseValues());

    expect(output.projectId).toBeUndefined();
    expect(output.ledgerCode).toBeUndefined();
    expect(output.description).toBeUndefined();
  });

  it('requires a category', () => {
    expect(TransactionExpenseFormSchema.safeParse(expenseValues({ intent: '' })).success).toBe(
      false,
    );
    expect(TransactionIncomeFormSchema.safeParse({ intent: '' }).success).toBe(false);
  });

  it('requires a detail code for an intent that delegates the code to the user', () => {
    const missing = TransactionExpenseFormSchema.safeParse(
      expenseValues({ intent: 'OTHER_EXPENSE', ledgerCode: '' }),
    );
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0]?.path).toEqual(['ledgerCode']);
    }

    expect(
      TransactionExpenseFormSchema.safeParse(
        expenseValues({ intent: 'OTHER_EXPENSE', ledgerCode: 'expense:other' }),
      ).success,
    ).toBe(true);
  });

  it('does not require a detail code for an intent with fixed mappings', () => {
    expect(
      TransactionExpenseFormSchema.safeParse(expenseValues({ intent: 'FOOD', ledgerCode: '' }))
        .success,
    ).toBe(true);
  });

  it('rejects a blank or non-positive amount at the boundary', () => {
    expect(TransactionExpenseFormSchema.safeParse(expenseValues({ amount: '' })).success).toBe(
      false,
    );
    expect(TransactionExpenseFormSchema.safeParse(expenseValues({ amount: '0' })).success).toBe(
      false,
    );
  });

  it('requires the allocation rows to sum to 100 when a split is present', () => {
    const wrongSum = TransactionExpenseFormSchema.safeParse(
      expenseValues({
        allocationItems: [
          { projectId: 'p1', percentage: '40' },
          { projectId: 'p2', percentage: '50' },
        ],
      }),
    );
    expect(wrongSum.success).toBe(false);
  });

  it('reports the row error, not a NaN total, when a percentage is blank', () => {
    const result = TransactionExpenseFormSchema.safeParse(
      expenseValues({
        allocationItems: [
          { projectId: 'p1', percentage: '60' },
          { projectId: 'p2', percentage: '' },
        ],
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('請輸入分配比例');
      expect(messages.some((message) => message.includes('NaN'))).toBe(false);
    }
  });

  it('derives triggerAllocation from the allocation rows', () => {
    const result = TransactionExpenseFormSchema.safeParse(
      expenseValues({
        allocationItems: [
          { projectId: 'p1', percentage: '60' },
          { projectId: 'p2', percentage: '40' },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerAllocation).toBe(true);
      expect(result.data.allocationDirection).toBe('EXPENSE');
      expect(result.data.projectId).toBeUndefined();
    }
  });

  it('folds a lone allocation row into a direct project link on save', () => {
    const result = TransactionExpenseFormSchema.safeParse(
      expenseValues({ allocationItems: [{ projectId: 'p1', percentage: '100' }] }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBe('p1');
      expect(result.data.allocationItems).toBeUndefined();
      expect(result.data.triggerAllocation).toBe(false);
      expect(result.data.allocationDirection).toBeUndefined();
    }
  });

  it('resolves a direct project supplied alongside a split in favour of the split', () => {
    const result = TransactionExpenseFormSchema.safeParse(
      expenseValues({
        projectId: 'p1',
        allocationItems: [
          { projectId: 'p2', percentage: '60' },
          { projectId: 'p3', percentage: '40' },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBeUndefined();
      expect(result.data.triggerAllocation).toBe(true);
    }
  });

  it('coerces allocation percentages and carries the direction', () => {
    const output = TransactionIncomeFormSchema.parse({
      amount: '10000',
      date: '2026-03-26',
      projectId: '',
      intent: 'OTHER_INCOME',
      ledgerCode: 'income:other',
      description: '',
      allocationItems: [
        { projectId: 'p1', percentage: '60' },
        { projectId: 'p2', percentage: '40' },
      ],
    });

    expect(output.intentType).toBe('INCOME');
    expect(output.amount).toBe(10000);
    expect(output.allocationDirection).toBe('INCOME');
    expect(output.allocationItems).toEqual([
      { projectId: 'p1', percentage: 60 },
      { projectId: 'p2', percentage: 40 },
    ]);
  });

  it('does not carry allocation rows when no split is selected', () => {
    const output = TransactionIncomeFormSchema.parse({
      amount: '100',
      date: '2026-03-26',
      projectId: 'p1',
      intent: 'SALARY',
      ledgerCode: 'income:salary',
      description: '',
      allocationItems: [],
    });

    expect(output.triggerAllocation).toBe(false);
    expect(output.projectId).toBe('p1');
    expect(output.allocationItems).toBeUndefined();
    expect(output.allocationDirection).toBeUndefined();
  });

  it('requires a ledger code on the advanced tab', () => {
    expect(
      TransactionAdvancedFormSchema.safeParse({
        amount: '500',
        date: '2026-03-26',
        intentType: 'MANUAL',
        projectId: '',
        intent: '',
        ledgerCode: '',
        description: '',
      }).success,
    ).toBe(false);
  });

  it('builds create defaults with today as the date', () => {
    const today = new Date().toISOString().slice(0, 10);

    expect(createTransactionExpenseFormValues()).toMatchObject({
      amount: '',
      date: today,
      allocationItems: [],
    });
    expect(createTransactionAdvancedFormValues()).toMatchObject({
      amount: '',
      date: today,
      intentType: 'MANUAL',
    });
  });

  it('folds a one-item split into a direct project link on edit', () => {
    const output: TransactionFormOutput = {
      intentType: 'INCOME',
      intent: 'SALARY',
      date: '2026-02-01',
      amount: 10000,
      ledgerCode: 'income:salary',
      description: 'February salary',
      triggerAllocation: true,
      allocationItems: [{ projectId: 'p1', percentage: 100 }],
      allocationDirection: 'INCOME',
    };

    expect(createTransactionIncomeFormValues(output)).toEqual({
      amount: '10000',
      date: '2026-02-01',
      projectId: 'p1',
      intent: 'SALARY',
      ledgerCode: 'income:salary',
      description: 'February salary',
      allocationItems: [],
    });
  });

  it('keeps a multi-item split and drops the stale direct link on edit', () => {
    const output: TransactionFormOutput = {
      intentType: 'EXPENSE',
      intent: 'OTHER_EXPENSE',
      date: '2026-02-01',
      amount: 3000,
      ledgerCode: 'expense:other',
      description: '',
      triggerAllocation: true,
      projectId: 'p1',
      allocationItems: [
        { projectId: 'p1', percentage: 60 },
        { projectId: 'p2', percentage: 40 },
      ],
      allocationDirection: 'EXPENSE',
    };

    expect(createTransactionExpenseFormValues(output)).toMatchObject({
      // The split wins over the stale direct link, so both are not sent.
      projectId: '',
      allocationItems: [
        { projectId: 'p1', percentage: '60' },
        { projectId: 'p2', percentage: '40' },
      ],
    });
  });
});
