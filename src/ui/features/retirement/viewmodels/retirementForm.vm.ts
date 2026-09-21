import { z } from 'zod';

import { RetirementExpenseType } from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
} from '@/domains/retirement/types';

const currentYear = () => new Date().getFullYear();

export const RetirementIncomeFormVMSchema = z.object({
  name: z.string().min(1),
  importedFrom: z.enum(['manual', 'transactionEntries']),
  autoUpdate: z.boolean().default(false),
  calculatedFrom: z
    .object({
      ledgerCode: z.string().optional(),
      sampleYear: z.number().int(),
      totalAmount: z.number().finite(),
      monthlyAverage: z.number().finite(),
      sampleCount: z.number().int().positive(),
      importedAt: z.string().min(1),
    })
    .optional(),
  incomeCategory: z.string().optional(),
  type: z.enum(['salary', 'bonus', 'pension', 'rent', 'other']),
  startYearMode: z.enum(['MANUAL', 'LINKED_TO_RETIREMENT']).default('MANUAL'),
  endYearMode: z.enum(['MANUAL', 'LINKED_TO_RETIREMENT']).default('MANUAL'),
  lifelong: z.boolean().default(false),
  currentAnnual: z.number().finite(),
  retirementAnnual: z.number().finite().optional(),
  growthRate: z.number().finite().optional(),
  startYear: z.number().int(),
  endYear: z.number().int().optional(),
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
      autoUpdate: false,
      type: 'salary',
      startYearMode: 'MANUAL',
      endYearMode: 'MANUAL',
      lifelong: false,
      currentAnnual: 0,
      startYear: year,
      endYear: year + 20,
    };
  }

  return {
    name: domain.name,
    importedFrom: domain.importedFrom,
    autoUpdate: domain.autoUpdate ?? false,
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    type: domain.type,
    startYearMode: domain.startYearMode ?? 'MANUAL',
    endYearMode: domain.endYearMode ?? 'MANUAL',
    lifelong: domain.lifelong ?? false,
    currentAnnual: domain.currentAnnual,
    retirementAnnual: domain.retirementAnnual,
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
  autoUpdate: vm.autoUpdate,
  ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
  ...(vm.incomeCategory && { incomeCategory: vm.incomeCategory }),
  type: vm.type,
  startYearMode: vm.startYearMode,
  endYearMode: vm.endYearMode,
  lifelong: vm.lifelong,
  currentAnnual: vm.currentAnnual,
  ...(vm.retirementAnnual !== undefined && { retirementAnnual: vm.retirementAnnual }),
  ...(vm.growthRate !== undefined && { growthRate: vm.growthRate }),
  startYear: vm.startYear,
  ...(typeof vm.endYear === 'number' && { endYear: vm.endYear }),
  ...(vm.note && { note: vm.note }),
});

export const RetirementExpenseFormVMSchema = z.object({
  name: z.string().min(1),
  sourceDebtAccountId: z.string().optional(),
  type: z.nativeEnum(RetirementExpenseType).default(RetirementExpenseType.GENERAL),
  includesPrincipal: z.boolean().default(false),
  interestOnly: z.boolean().default(false),
  calculatedFrom: z
    .object({
      debtAccountId: z.string().optional(),
      sampleStartYearMonth: z.string().optional(),
      sampleEndYearMonth: z.string().optional(),
      totalPaid: z.number().optional(),
      interestPaid: z.number().optional(),
      sampleCount: z.number().optional(),
      importedAt: z.string().optional(),
    })
    .optional(),
  expenseCategory: z.string().optional(),
  currentAnnual: z.number().finite(),
  growthRate: z.number().finite().optional(),
  retirementMultiplier: z.number().finite(), // stored as 0–100 in the form
  startYear: z.number().int(),
  endYear: z.string().optional(),
  note: z.string().optional(),
});

export type RetirementExpenseFormVM = z.infer<typeof RetirementExpenseFormVMSchema>;

export const buildRetirementExpenseFormVM = (
  domain: RetirementExpenseCategory | undefined,
  year = currentYear(),
): RetirementExpenseFormVM => {
  if (!domain) {
    return {
      currentAnnual: 0,
      growthRate: undefined,
      retirementMultiplier: 70,
      startYear: year,
      endYear: '',
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
      name: '',
    };
  }

  return {
    name: domain.name,
    sourceDebtAccountId: domain.sourceDebtAccountId,
    type: domain.type ?? RetirementExpenseType.GENERAL,
    includesPrincipal: domain.includesPrincipal ?? false,
    interestOnly: domain.interestOnly ?? false,
    calculatedFrom: domain.calculatedFrom,
    expenseCategory: domain.expenseCategory,
    currentAnnual: domain.currentAnnual,
    growthRate: domain.growthRate,
    retirementMultiplier: domain.retirementMultiplier * 100,
    startYear: domain.startYear,
    endYear: domain.endYear?.toString() || '',
    note: domain.note,
  };
};

export const mapRetirementExpenseVMToDomain = (
  vm: RetirementExpenseFormVM,
): Omit<RetirementExpenseCategory, 'id'> => ({
  name: vm.name,
  ...(vm.sourceDebtAccountId && { sourceDebtAccountId: vm.sourceDebtAccountId }),
  type: vm.type,
  includesPrincipal: vm.includesPrincipal,
  interestOnly: vm.interestOnly,
  ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
  ...(vm.expenseCategory && { expenseCategory: vm.expenseCategory }),
  currentAnnual: vm.currentAnnual,
  ...(vm.growthRate !== undefined && { growthRate: vm.growthRate }),
  retirementMultiplier: vm.retirementMultiplier / 100,
  startYear: vm.startYear,
  endYear: vm.endYear ? parseInt(vm.endYear, 10) : null,
  ...(vm.note && { note: vm.note }),
});

export const RetirementEventFormVMSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  phases: z
    .array(
      z.object({
        name: z.string().min(1),
        startYear: z.string().min(1),
        endYear: z.string().min(1),
        amount: z.string().min(1),
        growthRate: z.string().optional(),
      }),
    )
    .min(1),
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
      type: 'expense',
      phases: [
        {
          name: 'Phase 1',
          startYear: year.toString(),
          endYear: year.toString(),
          amount: '',
        },
      ],
      note: '',
    };
  }

  const phases =
    domain.phases && domain.phases.length > 0
      ? domain.phases.map((phase) => ({
          name: phase.name,
          startYear: phase.startYear.toString(),
          endYear: phase.endYear.toString(),
          amount: phase.amount != null ? String(phase.amount) : '',
          growthRate: phase.growthRate != null ? String(phase.growthRate) : '',
        }))
      : [
          {
            name: domain.name,
            startYear: String(domain.year ?? year),
            endYear: String(domain.year ?? year),
            amount: String(domain.amount ?? 0),
          },
        ];

  return {
    name: domain.name,
    type: domain.type,
    phases,
    note: domain.note || '',
  };
};

export const mapRetirementEventVMToDomain = (
  vm: RetirementEventFormVM,
): Omit<RetirementOneTimeEvent, 'id'> => ({
  name: vm.name,
  type: vm.type,
  phases: vm.phases.map((phase) => ({
    name: phase.name,
    startYear: parseInt(phase.startYear, 10),
    endYear: parseInt(phase.endYear, 10),
    amount: parseFloat(phase.amount),
    ...(phase.growthRate ? { growthRate: parseFloat(phase.growthRate) } : {}),
  })),
  ...(vm.note && { note: vm.note }),
});

export const RetirementAssumptionsFormVMSchema = z.object({
  currentYear: z.number().int(),
  birthYear: z.number().int(),
  retirementAge: z.number().int().positive(),
  lifeExpectancy: z.number().int().positive(),
  inflationRate: z.number().finite(),
  investmentReturnRate: z.number().finite(),
});

export type RetirementAssumptionsFormVM = z.infer<typeof RetirementAssumptionsFormVMSchema>;
