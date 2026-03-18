import { RetirementIncomeType } from '@/domains/retirement/types';

/**
 * Maps a generic category string to a valid retirement income source type.
 */
export const mapCategoryToRetirementIncomeType = (category: string): RetirementIncomeType => {
  const lower = category.toLowerCase();
  if (lower.includes('salary')) return RetirementIncomeType.SALARY;
  if (lower.includes('bonus')) return RetirementIncomeType.BONUS;
  if (lower.includes('rent')) return RetirementIncomeType.RENT;
  if (lower.includes('pension')) return RetirementIncomeType.PENSION;
  return RetirementIncomeType.OTHER;
};
