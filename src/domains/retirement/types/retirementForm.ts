import type { RetirementIncomeType } from './categories';

export interface RetirementIncomeFormData {
  name: string;
  importedFrom: 'manual' | 'plannedIncome';
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
