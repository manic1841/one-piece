/**
 * 假設變更的重算純運算（spec #301 §3.4）。
 *
 * 兩件事：
 * 1. 假設變更導致年份搬動時，要搬動哪些**已存的「退休時結束」列**（跟隨退休年齡／
 *    重新錨定出生年搬動）。
 * 2. `summary` 快取的過時偵測。
 *
 * 只搬已存的列、永不涉及未存草稿；`lifelong` 無年份、指定年齡不回推、匯入（債務
 * 還款）列不適用。全部是純函式，讓 Controller 保持薄。
 */
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { deriveRetirementEndCondition } from './retirementForm.vm';

export type { RetirementExpenseCategory, RetirementIncomeSource };

/** 假設變更後的時間錨（新 `birthYear`／`retirementAge`）。 */
export interface RetirementYearShiftTarget {
  birthYear: number;
  retirementAge: number;
}

/** 需搬動的列集合（整批取代 ADR-0030）；未變動的集合不出現。 */
export interface RetirementYearShift {
  incomes?: RetirementIncomeSource[];
  expenses?: RetirementExpenseCategory[];
}

type AssumptionPlan = Pick<RetirementPlan, 'birthYear' | 'retirementAge' | 'incomes' | 'expenses'>;

/**
 * `summary` 快取的過時偵測（spec #301 §3.4）：`summary.retirementYear !== birthYear +
 * retirementAge`。已知盲區（通膨／投報／壽命變更不觸發）為刻意接受、不修。
 * 沒有快取的計畫不算過時——那由空狀態引導至 Recalculate。
 */
export const isRetirementSummaryStale = (
  plan: Pick<RetirementPlan, 'birthYear' | 'retirementAge' | 'summary'>,
): boolean =>
  plan.summary != null && plan.summary.retirementYear !== plan.birthYear + plan.retirementAge;

/**
 * 假設變更導致退休年變動時，取出需搬動**已存「退休時結束」列**的新集合（spec #301
 * §3.4）。沒有列需要搬動（或退休年未變）時回 `null`——呼叫端據此不提示、不寫入。
 *
 * - 只有「退休時結束」列跟隨搬動：以 `deriveRetirementEndCondition(..., 舊退休年) ===
 *   'retirement'` 判定；`lifelong` 無年份、指定年齡／指定年份不回推。
 * - 債務還款列（`debt_payment`）的 `endYear` 由匯入決定、不屬四語意，永不搬動。
 * - 搬動只針對**已存的列**；未存草稿不在此、也不重新映射。
 * - 搬動後 `endYear` 不得早於列的 `startYear`，否則該列維持原狀（不產生非法列）。
 */
export const shiftRetirementEndingRows = (
  plan: AssumptionPlan,
  next: RetirementYearShiftTarget,
): RetirementYearShift | null => {
  const oldRetirementYear = plan.birthYear + plan.retirementAge;
  const newRetirementYear = next.birthYear + next.retirementAge;
  if (newRetirementYear === oldRetirementYear) return null;

  const follows = (row: {
    lifelong?: boolean;
    endYear?: number | null;
    startYear: number;
  }): boolean =>
    deriveRetirementEndCondition(row, oldRetirementYear) === 'retirement' &&
    newRetirementYear >= row.startYear;

  const incomes = plan.incomes.map((income) =>
    follows(income) ? { ...income, endYear: newRetirementYear } : income,
  );
  const expenses = plan.expenses.map((expense) =>
    expense.type !== 'debt_payment' && follows(expense)
      ? { ...expense, endYear: newRetirementYear }
      : expense,
  );

  const incomeChanged = incomes.some((row, index) => row !== plan.incomes[index]);
  const expenseChanged = expenses.some((row, index) => row !== plan.expenses[index]);
  if (!incomeChanged && !expenseChanged) return null;

  return {
    ...(incomeChanged && { incomes }),
    ...(expenseChanged && { expenses }),
  };
};
