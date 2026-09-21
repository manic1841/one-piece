import { RetirementExpenseType } from '@/domains/retirement/schemas';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';

export type PlannedExpense = {
  ledgerCode: string;
  amount: number;
};

const toExpenseCategoryName = (ledgerCode: string): string => {
  const segments = ledgerCode.split(':').slice(1);
  if (segments.length === 0) return ledgerCode;
  return segments.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

/**
 * Pure logic to group and calculate expense category suggestions from expense
 * ledger entries. The ledger code is the merge key; currentAnnual reflects the
 * sampled full year's actual spend. retirementMultiplier is stored as a factor
 * (0-1): imported categories keep their full level after retirement.
 */
export function groupExpenseSuggestions(
  plannedExpenses: PlannedExpense[],
  sampleYear: number,
  currentYear: number,
): RetirementExpenseCategory[] {
  const expenseMap = new Map<string, { total: number; count: number }>();

  plannedExpenses.forEach((pe) => {
    const current = expenseMap.get(pe.ledgerCode) || { total: 0, count: 0 };
    current.total += pe.amount;
    current.count += 1;
    expenseMap.set(pe.ledgerCode, current);
  });

  const categories: RetirementExpenseCategory[] = [];
  expenseMap.forEach((value, key) => {
    const category: RetirementExpenseCategory = {
      id: crypto.randomUUID(),
      name: toExpenseCategoryName(key),
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
      expenseCategory: key,
      currentAnnual: Math.round(value.total),
      retirementMultiplier: 1,
      startYear: currentYear,
      endYear: null,
      note: `Based on ${sampleYear} full-year expense entries (${value.count} samples)`,
    };
    categories.push(category);
  });

  return categories;
}
