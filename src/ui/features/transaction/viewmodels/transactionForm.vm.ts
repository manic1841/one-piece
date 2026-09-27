import { z } from 'zod';

import { optionalText, requiredNumber } from '@/shared/schemas/coerce';

import { type AllocationDraftItem } from '../types/allocation';
import { type TransactionFormOutput } from '../types/transaction';

/**
 * Per-tab Form VM schemas (ADR-0064).
 *
 * The transaction dialog composes one transaction through five tab panels. Each
 * panel is its own RHF form with its own schema — the tab selection is hook
 * state, never a form field. Every schema coerces at the boundary, so `z.input`
 * is the string shape a field emits and `z.output` is the numeric
 * `TransactionFormOutput` the controller forwards.
 */

const requiredText = (message: string) => z.string().min(1, message);

/** Positive money amount; blank input is an error, not `0`. */
const positiveAmount = (message = '請輸入金額') =>
  requiredNumber(message).refine((value) => value > 0, { error: '金額必須大於零' });

const allocationItemSchema = z.object({
  projectId: z.string().min(1, '請選擇專案'),
  percentage: requiredNumber('請輸入分配比例'),
});

/**
 * Cross-field allocation rule: a triggered allocation needs at least one item
 * and the percentages must sum to 100. The numeric VM re-checks the same rule
 * as the authoritative gate.
 */
const refineAllocation = (
  value: { triggerAllocation: boolean; allocationItems: { percentage: number }[] },
  context: z.RefinementCtx,
) => {
  if (!value.triggerAllocation) return;

  if (value.allocationItems.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: '請至少填寫一筆分配。',
      path: ['allocationItems'],
    });
    return;
  }

  const total = value.allocationItems.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `分配比例合計必須為 100%（目前 ${total}%）`,
      path: ['allocationItems'],
    });
  }
};

const amountDate = {
  amount: positiveAmount(),
  date: requiredText('請選擇日期'),
};

const description = { description: optionalText() };

export const TransactionExpenseFormSchema = z
  .object({
    ...amountDate,
    projectId: optionalText(),
    intent: optionalText(),
    ledgerCode: optionalText(),
    ...description,
    triggerAllocation: z.boolean(),
    allocationItems: z.array(allocationItemSchema),
  })
  .superRefine(refineAllocation)
  .transform(
    (value): TransactionFormOutput => ({
      intentType: 'EXPENSE',
      intent: value.intent,
      date: value.date,
      amount: value.amount,
      projectId: value.projectId,
      ledgerCode: value.ledgerCode,
      description: value.description,
      triggerAllocation: value.triggerAllocation,
      allocationItems: value.triggerAllocation ? value.allocationItems : undefined,
      allocationDirection: value.triggerAllocation ? 'EXPENSE' : undefined,
    }),
  );

export const TransactionIncomeFormSchema = z
  .object({
    ...amountDate,
    intent: optionalText(),
    ledgerCode: optionalText(),
    ...description,
    triggerAllocation: z.boolean(),
    allocationItems: z.array(allocationItemSchema),
  })
  .superRefine(refineAllocation)
  .transform(
    (value): TransactionFormOutput => ({
      intentType: 'INCOME',
      intent: value.intent,
      date: value.date,
      amount: value.amount,
      ledgerCode: value.ledgerCode,
      description: value.description,
      triggerAllocation: value.triggerAllocation,
      allocationItems: value.triggerAllocation ? value.allocationItems : undefined,
      allocationDirection: value.triggerAllocation ? 'INCOME' : undefined,
    }),
  );

const categoryPanelFields = {
  ...amountDate,
  projectId: optionalText(),
  intent: optionalText(),
  ledgerCode: optionalText(),
  ...description,
};

/** The investment and financing panels share a field set and differ only by intent. */
const categoryPanelSchema = (intentType: 'INVESTMENT' | 'FINANCING') =>
  z.object(categoryPanelFields).transform(
    (value): TransactionFormOutput => ({
      intentType,
      intent: value.intent,
      date: value.date,
      amount: value.amount,
      projectId: value.projectId,
      ledgerCode: value.ledgerCode,
      description: value.description,
    }),
  );

export const TransactionInvestmentFormSchema = categoryPanelSchema('INVESTMENT');

export const TransactionFinancingFormSchema = categoryPanelSchema('FINANCING');

export const TransactionAdvancedFormSchema = z
  .object({
    ...amountDate,
    intentType: z.literal('MANUAL'),
    projectId: optionalText(),
    intent: optionalText(),
    ledgerCode: requiredText('請選擇會計科目'),
    ...description,
  })
  .transform(
    (value): TransactionFormOutput => ({
      intentType: value.intentType,
      intent: value.intent,
      date: value.date,
      amount: value.amount,
      projectId: value.projectId,
      ledgerCode: value.ledgerCode,
      description: value.description,
    }),
  );

export type TransactionExpenseFormInput = z.input<typeof TransactionExpenseFormSchema>;
export type TransactionIncomeFormInput = z.input<typeof TransactionIncomeFormSchema>;
export type TransactionInvestmentFormInput = z.input<typeof TransactionInvestmentFormSchema>;
export type TransactionFinancingFormInput = z.input<typeof TransactionFinancingFormSchema>;
export type TransactionAdvancedFormInput = z.input<typeof TransactionAdvancedFormSchema>;

/**
 * The slice of the expense/income tab forms that the shared allocation repeater
 * reads (`amount`) and owns (`allocationItems`).
 */
export type TransactionAllocationFormValues = {
  amount: TransactionExpenseFormInput['amount'];
  allocationItems: TransactionExpenseFormInput['allocationItems'];
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

const toDraftAllocationItems = (items?: TransactionFormOutput['allocationItems']) =>
  (items ?? []).map<AllocationDraftItem>((item) => ({
    projectId: item.projectId,
    percentage: item.percentage.toString(),
  }));

export const createTransactionExpenseFormValues = (
  output?: TransactionFormOutput | null,
): TransactionExpenseFormInput => ({
  amount: output ? output.amount.toString() : '',
  date: output?.date ?? todayIso(),
  projectId: output?.projectId ?? '',
  intent: output?.intent ?? '',
  ledgerCode: output?.ledgerCode ?? '',
  description: output?.description ?? '',
  triggerAllocation: Boolean(output?.triggerAllocation),
  allocationItems: toDraftAllocationItems(output?.allocationItems),
});

export const createTransactionIncomeFormValues = (
  output?: TransactionFormOutput | null,
): TransactionIncomeFormInput => ({
  amount: output ? output.amount.toString() : '',
  date: output?.date ?? todayIso(),
  intent: output?.intent ?? '',
  ledgerCode: output?.ledgerCode ?? '',
  description: output?.description ?? '',
  triggerAllocation: Boolean(output?.triggerAllocation),
  allocationItems: toDraftAllocationItems(output?.allocationItems),
});

export const createTransactionInvestmentFormValues = (
  output?: TransactionFormOutput | null,
): TransactionInvestmentFormInput => ({
  amount: output ? output.amount.toString() : '',
  date: output?.date ?? todayIso(),
  projectId: output?.projectId ?? '',
  intent: output?.intent ?? '',
  ledgerCode: output?.ledgerCode ?? '',
  description: output?.description ?? '',
});

export const createTransactionFinancingFormValues = (
  output?: TransactionFormOutput | null,
): TransactionFinancingFormInput => ({
  amount: output ? output.amount.toString() : '',
  date: output?.date ?? todayIso(),
  projectId: output?.projectId ?? '',
  intent: output?.intent ?? '',
  ledgerCode: output?.ledgerCode ?? '',
  description: output?.description ?? '',
});

export const createTransactionAdvancedFormValues = (
  output?: TransactionFormOutput | null,
): TransactionAdvancedFormInput => ({
  amount: output ? output.amount.toString() : '',
  date: output?.date ?? todayIso(),
  intentType: 'MANUAL',
  projectId: output?.projectId ?? '',
  intent: output?.intent ?? '',
  ledgerCode: output?.ledgerCode ?? '',
  description: output?.description ?? '',
});
