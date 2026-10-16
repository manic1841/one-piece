import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlan,
} from '@/domains/retirement/types';
import {
  type RetirementBaselineFilter,
  RetirementBaselineLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { formatCurrency } from '@/ui/utils';

import { deriveRetirementEndCondition, retirementEndConditionText } from './retirementForm.vm';

export type { RetirementExpenseCategory, RetirementIncomeSource };

/** 篩選桶：收入／一般支出／債務還款（spec #301 §4.2 的 FilterStrip）。 */
export type RetirementBaselineCategory = 'income' | 'expense' | 'debt';

export interface RetirementBaselineRowVM {
  id: string;
  category: RetirementBaselineCategory;
  name: string;
  /** 資料來源：ledger code／`incomeCategory`／`sourceDebtAccountId`。 */
  sourceText: string;
  /** 基準年金額（唯讀，由匯入推導）。 */
  baseAmountText: string;
  /** 成長率推導值（表格唯讀；於側欄 Advanced 編輯）。 */
  growthText: string;
  /** 結束條件（spec #301 §2.2 推導標籤）。 */
  endConditionText: string;
  /** 無匯入來源的舊列：保留但唯讀（不得手動新增）。 */
  isReadOnly: boolean;
}

/** 列及其領域物件：領域物件供側邊編輯器初始化（Surface 不碰 domain 型別，經此轉出）。 */
export type RetirementBaselineItem =
  | { kind: 'income'; domain: RetirementIncomeSource; vm: RetirementBaselineRowVM }
  | { kind: 'expense'; domain: RetirementExpenseCategory; vm: RetirementBaselineRowVM };

const amountText = (value: number | null | undefined): string =>
  value == null ? RetirementBaselineLabels.noSource : formatCurrency(value);

const growthText = (growthRate: number | undefined): string =>
  growthRate != null
    ? RetirementBaselineLabels.growthPercent(growthRate)
    : RetirementBaselineLabels.growthInflation;

export const mapRetirementIncomeToBaselineRow = (
  income: RetirementIncomeSource,
  retirementYear: number,
): RetirementBaselineRowVM => ({
  id: income.id,
  category: 'income',
  name: income.name,
  sourceText:
    income.incomeCategory ?? income.calculatedFrom?.ledgerCode ?? RetirementBaselineLabels.noSource,
  baseAmountText: amountText(income.currentAnnual),
  growthText: growthText(income.growthRate),
  endConditionText: retirementEndConditionText(
    deriveRetirementEndCondition(income, retirementYear),
    income.endYear,
  ),
  // A scenario-only income carries no import source, so it stays read-only.
  isReadOnly: income.currentAnnual == null,
});

export const mapRetirementExpenseToBaselineRow = (
  expense: RetirementExpenseCategory,
  retirementYear: number,
): RetirementBaselineRowVM => ({
  id: expense.id,
  category: expense.type === 'debt_payment' ? 'debt' : 'expense',
  name: expense.name,
  sourceText:
    expense.sourceDebtAccountId ?? expense.expenseCategory ?? RetirementBaselineLabels.noSource,
  baseAmountText: amountText(expense.currentAnnual),
  growthText: growthText(expense.growthRate),
  endConditionText: retirementEndConditionText(
    deriveRetirementEndCondition(expense, retirementYear),
    expense.endYear ?? undefined,
  ),
  isReadOnly: false,
});

export const mapRetirementPlanToBaselineItems = (
  plan: Pick<RetirementPlan, 'birthYear' | 'retirementAge' | 'incomes' | 'expenses'>,
): RetirementBaselineItem[] => {
  const retirementYear = plan.birthYear + plan.retirementAge;
  return [
    ...plan.incomes.map(
      (income): RetirementBaselineItem => ({
        kind: 'income',
        domain: income,
        vm: mapRetirementIncomeToBaselineRow(income, retirementYear),
      }),
    ),
    ...plan.expenses.map(
      (expense): RetirementBaselineItem => ({
        kind: 'expense',
        domain: expense,
        vm: mapRetirementExpenseToBaselineRow(expense, retirementYear),
      }),
    ),
  ];
};

export const filterRetirementBaselineItems = (
  items: RetirementBaselineItem[],
  filter: RetirementBaselineFilter,
): RetirementBaselineItem[] =>
  filter === 'all' ? items : items.filter((item) => item.vm.category === filter);
