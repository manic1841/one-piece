import { z } from 'zod';
import {
  RetirementPlanSchema,
  RetirementPlanCreateSchema,
  RetirementIncomeSourceSchema,
  RetirementExpenseCategorySchema,
  RetirementOneTimeEventSchema,
  RetirementProjectionYearSchema,
  RetirementIncomeType as RetirementIncomeTypeEnum,
  RetirementIncomeImportSource as RetirementIncomeImportSourceEnum,
} from './schemas';

export type RetirementPlan = z.infer<typeof RetirementPlanSchema>;
export type RetirementPlanCreate = z.infer<typeof RetirementPlanCreateSchema>;
export type RetirementIncomeSource = z.infer<typeof RetirementIncomeSourceSchema>;
export type RetirementExpenseCategory = z.infer<typeof RetirementExpenseCategorySchema>;
export type RetirementOneTimeEvent = z.infer<typeof RetirementOneTimeEventSchema>;
export type RetirementProjectionYear = z.infer<typeof RetirementProjectionYearSchema>;

export type RetirementIncomeType = RetirementIncomeTypeEnum;
export const RetirementIncomeType = RetirementIncomeTypeEnum;

export type RetirementIncomeImportSource = RetirementIncomeImportSourceEnum;
export const RetirementIncomeImportSource = RetirementIncomeImportSourceEnum;

// Form Types (Consolidated from retirementForm.ts)
export interface RetirementIncomeFormData {
  name: string;
  importedFrom: RetirementIncomeImportSource;
  calculatedFrom?: {
    startDate: string;
    endDate: string;
    totalAmount: number;
    monthlyAverage: number;
    sampleCount: number;
    importedAt: string;
  };
  incomeCategory?: string;
  type: RetirementIncomeType;
  baseAmount: number;
  growthRate: number;
  startYear: number;
  endYear: number;
  note?: string;
}

export interface RetirementExpenseFormData {
  name: string;
  sourceProjectId?: string;
  baseAmount: number;
  growthRate: number;
  retirementMultiplier: number; // as percentage (0-100+)
  startYear: number;
  endYear?: string; // string because it's an input field that can be empty (Lifetime)
  percentOfSalary?: number;
  note?: string;
}

export interface RetirementEventFormData {
  name: string;
  year: string;
  type: 'income' | 'expense';
  amount: string;
  note?: string;
}
