import { z } from 'zod';

import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { optionalText, requiredNumber } from '@/shared/schemas/coerce';

import { type AllocationDraftItem } from '../types/allocation';
import { type TransactionFormOutput } from '../types/transaction';

/** Per-tab form schemas; each coerces its string fields into the numeric `TransactionFormOutput`. */

const requiredText = (message: string) => z.string().min(1, message);

/** Positive money amount; blank input is an error, not `0`. */
const positiveAmount = (message = '請輸入金額') =>
  requiredNumber(message).refine((value) => value > 0, { error: '金額必須大於零' });

const allocationItemSchema = z.object({
  projectId: z.string().min(1, '請選擇專案'),
  percentage: requiredNumber('請輸入分配比例'),
});

/**
 * A one-project split and a direct project link describe the same thing, so a
 * lone item is folded into `projectId` and the split is dropped. Two or more
 * items stay a split, and a split always wins over a simultaneously supplied
 * `projectId`. This is the single definition of "1 = link, 2+ = split": the
 * schemas apply it on save, the form initializers on load.
 */
export const foldProjectAttribution = <Item extends { projectId: string }>(
  projectId: string | undefined,
  items: Item[],
): { projectId: string | undefined; allocationItems: Item[] } =>
  items.length === 1
    ? { projectId: items[0]?.projectId, allocationItems: [] }
    : { projectId: items.length > 1 ? undefined : projectId, allocationItems: items };

/**
 * Cross-field allocation rule: a split must total exactly 100. The direct-link
 * vs multi-project split split itself is resolved by `foldProjectAttribution`,
 * and `triggerAllocation` is derived from the item count, not an input field.
 */
const refineAllocation = (
  value: { allocationItems: { percentage: number }[] },
  context: z.RefinementCtx,
) => {
  if (value.allocationItems.length === 0) return;
  // A blank row already fails its own `requiredNumber`; summing it would print
  // `NaN%` in the total message.
  if (value.allocationItems.some((item) => Number.isNaN(item.percentage))) return;

  const total = value.allocationItems.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `分配比例合計必須為 100%（目前 ${total}%）`,
      path: ['allocationItems'],
    });
  }
};

/**
 * An intent whose mapping delegates the compensating side to the user needs an
 * explicit code; without it the entry builder has nothing to resolve.
 */
const refineUserSelectCode = (
  value: { intent?: string; ledgerCode?: string },
  context: z.RefinementCtx,
) => {
  const mapping = DEFAULT_INTENT_MAPPINGS.find((item) => item.intent === value.intent);
  if (!mapping?.debitUserSelect && !mapping?.creditUserSelect) return;
  if (value.ledgerCode) return;

  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: '請選擇詳細類別',
    path: ['ledgerCode'],
  });
};

const amountDate = {
  amount: positiveAmount(),
  date: requiredText('請選擇日期'),
};

const description = { description: optionalText() };

/** Fields shared by both attribution tabs (expense and income). */
const attributionFields = {
  ...amountDate,
  projectId: optionalText(),
  intent: requiredText('請選擇類別'),
  ledgerCode: optionalText(),
  ...description,
  allocationItems: z.array(allocationItemSchema),
};

/** The tab's schema output: attribution folded, `triggerAllocation` derived. */
const attributionTransform =
  (intentType: Extract<TransactionFormOutput['intentType'], 'EXPENSE' | 'INCOME'>) =>
  (value: z.infer<z.ZodObject<typeof attributionFields>>): TransactionFormOutput => {
    const attribution = foldProjectAttribution(value.projectId, value.allocationItems);
    const hasAllocation = attribution.allocationItems.length > 0;
    return {
      intentType,
      intent: value.intent,
      date: value.date,
      amount: value.amount,
      projectId: attribution.projectId || undefined,
      ledgerCode: value.ledgerCode,
      description: value.description,
      triggerAllocation: hasAllocation,
      allocationItems: hasAllocation ? attribution.allocationItems : undefined,
      allocationDirection: hasAllocation ? intentType : undefined,
    };
  };

export const TransactionExpenseFormSchema = z
  .object(attributionFields)
  .superRefine(refineUserSelectCode)
  .superRefine(refineAllocation)
  .transform(attributionTransform('EXPENSE'));

export const TransactionIncomeFormSchema = z
  .object(attributionFields)
  .superRefine(refineUserSelectCode)
  .superRefine(refineAllocation)
  .transform(attributionTransform('INCOME'));

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
export type TransactionAdvancedFormInput = z.input<typeof TransactionAdvancedFormSchema>;

/**
 * The slice of the expense/income tab forms that the shared project widget reads
 * (`amount`, `projectId`) and owns (`allocationItems`).
 */
export type TransactionAllocationFormValues = {
  amount: TransactionExpenseFormInput['amount'];
  projectId: TransactionExpenseFormInput['projectId'];
  allocationItems: TransactionExpenseFormInput['allocationItems'];
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

const toDraftAllocationItems = (items?: TransactionFormOutput['allocationItems']) =>
  (items ?? []).map<AllocationDraftItem>((item) => ({
    projectId: item.projectId,
    percentage: item.percentage.toString(),
  }));

/**
 * `foldProjectAttribution` returns `undefined` for an absent link; the form
 * fields hold strings, so an absent link becomes `''`.
 */
const normalizeProjectAttribution = (
  projectId: string | undefined,
  items: AllocationDraftItem[],
): { projectId: string; allocationItems: AllocationDraftItem[] } => {
  const folded = foldProjectAttribution(projectId, items);
  return { projectId: folded.projectId ?? '', allocationItems: folded.allocationItems };
};

export const createTransactionExpenseFormValues = (
  output?: TransactionFormOutput | null,
): TransactionExpenseFormInput => {
  const attribution = normalizeProjectAttribution(
    output?.projectId,
    toDraftAllocationItems(output?.allocationItems),
  );

  return {
    amount: output ? output.amount.toString() : '',
    date: output?.date ?? todayIso(),
    projectId: attribution.projectId,
    intent: output?.intent ?? '',
    ledgerCode: output?.ledgerCode ?? '',
    description: output?.description ?? '',
    allocationItems: attribution.allocationItems,
  };
};

export const createTransactionIncomeFormValues = (
  output?: TransactionFormOutput | null,
): TransactionIncomeFormInput => {
  const attribution = normalizeProjectAttribution(
    output?.projectId,
    toDraftAllocationItems(output?.allocationItems),
  );

  return {
    amount: output ? output.amount.toString() : '',
    date: output?.date ?? todayIso(),
    projectId: attribution.projectId,
    intent: output?.intent ?? '',
    ledgerCode: output?.ledgerCode ?? '',
    description: output?.description ?? '',
    allocationItems: attribution.allocationItems,
  };
};

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
