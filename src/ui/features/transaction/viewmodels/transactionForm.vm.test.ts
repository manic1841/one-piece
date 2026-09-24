import { describe, expect, it } from 'vitest';

import { type TransactionFormOutput } from '../types/transaction';
import {
  TransactionAdvancedFormSchema,
  TransactionExpenseFormSchema,
  TransactionIncomeFormSchema,
  TransactionInvestmentFormSchema,
  createTransactionAdvancedFormValues,
  createTransactionExpenseFormValues,
  createTransactionIncomeFormValues,
} from './transactionForm.vm';

const expenseValues = (overrides: Record<string, unknown> = {}) => ({
  amount: '1200',
  date: '2026-03-26',
  projectId: '',
  intent: '',
  ledgerCode: '',
  description: '',
  triggerAllocation: false,
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
    expect(output.intent).toBeUndefined();
    expect(output.ledgerCode).toBeUndefined();
    expect(output.description).toBeUndefined();
  });

  it('rejects a blank or non-positive amount at the boundary', () => {
    expect(TransactionExpenseFormSchema.safeParse(expenseValues({ amount: '' })).success).toBe(
      false,
    );
    expect(TransactionExpenseFormSchema.safeParse(expenseValues({ amount: '0' })).success).toBe(
      false,
    );
  });

  it('requires the allocation rows to sum to 100 when allocation is triggered', () => {
    const missingRows = TransactionExpenseFormSchema.safeParse(
      expenseValues({ triggerAllocation: true }),
    );
    expect(missingRows.success).toBe(false);

    const wrongSum = TransactionExpenseFormSchema.safeParse(
      expenseValues({
        triggerAllocation: true,
        allocationItems: [
          { projectId: 'p1', percentage: '40' },
          { projectId: 'p2', percentage: '50' },
        ],
      }),
    );
    expect(wrongSum.success).toBe(false);
  });

  it('coerces allocation percentages and carries the direction', () => {
    const output = TransactionIncomeFormSchema.parse({
      amount: '10000',
      date: '2026-03-26',
      intent: 'OTHER_INCOME',
      ledgerCode: 'income:other',
      description: '',
      triggerAllocation: true,
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

  it('does not carry allocation rows when the toggle is off', () => {
    const output = TransactionIncomeFormSchema.parse({
      amount: '100',
      date: '2026-03-26',
      intent: '',
      ledgerCode: '',
      description: '',
      triggerAllocation: false,
      allocationItems: [{ projectId: 'p1', percentage: '100' }],
    });

    expect(output.triggerAllocation).toBe(false);
    expect(output.allocationItems).toBeUndefined();
    expect(output.allocationDirection).toBeUndefined();
  });

  it('leaves investment and financing without allocation fields', () => {
    const output = TransactionInvestmentFormSchema.parse({
      amount: '500',
      date: '2026-03-26',
      projectId: '',
      intent: 'REAL_ESTATE_BUY',
      ledgerCode: 'asset:property',
      description: '',
    });

    expect(output.intentType).toBe('INVESTMENT');
    expect(output.amount).toBe(500);
    expect('triggerAllocation' in output).toBe(false);
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
      triggerAllocation: false,
      allocationItems: [],
    });
    expect(createTransactionAdvancedFormValues()).toMatchObject({
      amount: '',
      date: today,
      intentType: 'MANUAL',
    });
  });

  it('builds edit defaults from an existing transaction output', () => {
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
      intent: 'SALARY',
      ledgerCode: 'income:salary',
      description: 'February salary',
      triggerAllocation: true,
      allocationItems: [{ projectId: 'p1', percentage: '100' }],
    });
  });
});
