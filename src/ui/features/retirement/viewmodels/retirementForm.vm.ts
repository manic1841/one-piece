import { z } from 'zod';

import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
} from '@/domains/retirement/types';

const currentYear = () => new Date().getFullYear();

export const RetirementIncomeFormVMSchema = z.object({
  name: z.string().min(1),
  importedFrom: z.enum(['manual', 'plannedIncome']),
  calculatedFrom: z
    .object({
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      totalAmount: z.number().finite(),
      monthlyAverage: z.number().finite(),
      sampleCount: z.number().int().positive(),
      importedAt: z.string().min(1),
    })
    .optional(),
  incomeCategory: z.string().optional(),
  type: z.enum(['salary', 'bonus', 'pension', 'rent', 'other']),
  baseAmount: z.number().finite(),
  growthRate: z.number().finite(),
  startYear: z.number().int(),
  endYear: z.number().int(),
  note: z.string().optional(),
});

export type RetirementIncomeFormVM = z.infer<typeof RetirementIncomeFormVMSchema>;

export const buildRetirementIncomeFormVM = (
  domain: RetirementIncomeSource | undefined,
  year = currentYear(),
): RetirementIncomeFormVM => {
  if (!domain) {
    return {
      name: '',
      importedFrom: 'manual',
      type: 'salary',
      baseAmount: 0,
      growthRate: 3,
      startYear: year,
      endYear: year + 20,
    };
  }

  return {
    name: domain.name,
    importedFrom: domain.importedFrom,
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    type: domain.type,
    baseAmount: domain.baseAmount,
    growthRate: domain.growthRate,
    startYear: domain.startYear,
    endYear: domain.endYear,
    note: domain.note,
  };
};

export const mapRetirementIncomeVMToDomain = (
  vm: RetirementIncomeFormVM,
): Omit<RetirementIncomeSource, 'id'> => ({
  name: vm.name,
  importedFrom: vm.importedFrom,
  calculatedFrom: vm.calculatedFrom,
  incomeCategory: vm.incomeCategory,
  type: vm.type,
  baseAmount: vm.baseAmount,
  growthRate: vm.growthRate,
  startYear: vm.startYear,
  endYear: vm.endYear,
  note: vm.note,
});

export const RetirementExpenseFormVMSchema = z.object({
  name: z.string().min(1),
  sourceProjectId: z.string().optional(),
  baseAmount: z.number().finite(),
  growthRate: z.number().finite(),
  retirementMultiplier: z.number().finite(),
  startYear: z.number().int(),
  endYear: z.string().optional(),
  percentOfSalary: z.number().finite().optional(),
  note: z.string().optional(),
});

export type RetirementExpenseFormVM = z.infer<typeof RetirementExpenseFormVMSchema>;

export const buildRetirementExpenseFormVM = (
  domain: RetirementExpenseCategory | undefined,
  year = currentYear(),
): RetirementExpenseFormVM => {
  if (!domain) {
    return {
      name: '',
      baseAmount: 0,
      growthRate: 2,
      retirementMultiplier: 70,
      startYear: year,
      endYear: '',
      percentOfSalary: 0,
    };
  }

  return {
    name: domain.name,
    sourceProjectId: domain.sourceProjectId,
    baseAmount: domain.baseAmount,
    growthRate: domain.growthRate,
    retirementMultiplier: domain.retirementMultiplier * 100,
    startYear: domain.startYear,
    endYear: domain.endYear?.toString() || '',
    percentOfSalary: domain.percentOfSalary || 0,
    note: domain.note,
  };
};

export const mapRetirementExpenseVMToDomain = (
  vm: RetirementExpenseFormVM,
): Omit<RetirementExpenseCategory, 'id'> => ({
  name: vm.name,
  sourceProjectId: vm.sourceProjectId === 'none' ? undefined : vm.sourceProjectId,
  baseAmount: vm.baseAmount,
  growthRate: vm.growthRate,
  retirementMultiplier: vm.retirementMultiplier / 100,
  startYear: vm.startYear,
  endYear: vm.endYear ? parseInt(vm.endYear, 10) : null,
  percentOfSalary: vm.percentOfSalary && vm.percentOfSalary > 0 ? vm.percentOfSalary : undefined,
  note: vm.note,
});

export const RetirementEventFormVMSchema = z.object({
  name: z.string().min(1),
  year: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1),
  note: z.string().optional(),
});

export type RetirementEventFormVM = z.infer<typeof RetirementEventFormVMSchema>;

export const buildRetirementEventFormVM = (
  domain: RetirementOneTimeEvent | undefined,
  year = currentYear(),
): RetirementEventFormVM => {
  if (!domain) {
    return {
      name: '',
      year: year.toString(),
      type: 'expense',
      amount: '',
      note: '',
    };
  }

  return {
    name: domain.name,
    year: domain.year.toString(),
    type: domain.type,
    amount: domain.amount.toString(),
    note: domain.note || '',
  };
};

export const mapRetirementEventVMToDomain = (
  vm: RetirementEventFormVM,
): Omit<RetirementOneTimeEvent, 'id'> => ({
  name: vm.name,
  year: parseInt(vm.year, 10),
  type: vm.type,
  amount: parseFloat(vm.amount),
  note: vm.note || undefined,
});

export const RetirementAssumptionsFormVMSchema = z.object({
  currentYear: z.number().int(),
  birthYear: z.number().int(),
  retirementAge: z.number().int().positive(),
  lifeExpectancy: z.number().int().positive(),
  currentSavings: z.number().finite(),
  salaryGrowthRate: z.number().finite(),
  inflationRate: z.number().finite(),
  investmentReturnRate: z.number().finite(),
});

export type RetirementAssumptionsFormVM = z.infer<typeof RetirementAssumptionsFormVMSchema>;
