import { z } from 'zod';

import {
  CalculationMode,
  RetirementExpenseType,
  SalaryPercentageRetirementMode,
} from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
} from '@/domains/retirement/types';

const currentYear = () => new Date().getFullYear();

export const RetirementIncomeFormVMSchema = z.object({
  name: z.string().min(1),
  importedFrom: z.enum(['manual', 'transactionEntries']),
  incomeCalculationMode: z.enum(['FIXED', 'IMPORTED', 'DERIVED']).default('FIXED'),
  calculatedFrom: z
    .object({
      ledgerCode: z.string().optional(),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      totalAmount: z.number().finite(),
      monthlyAverage: z.number().finite(),
      sampleCount: z.number().int().positive(),
      importedAt: z.string().min(1),
    })
    .optional(),
  incomeCategory: z.string().optional(),
  baseIncomeId: z.string().optional(),
  multiplier: z.number().positive().optional(),
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
      incomeCalculationMode: 'FIXED',
      type: 'salary',
      baseAmount: 0,
      growthRate: 3,
      startYear: year,
      endYear: year + 20,
      baseIncomeId: undefined,
      multiplier: 1,
    };
  }

  return {
    name: domain.name,
    importedFrom: domain.importedFrom,
    incomeCalculationMode: domain.incomeCalculationMode ?? 'FIXED',
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    baseIncomeId: domain.derivedFrom?.baseIncomeId,
    multiplier: domain.derivedFrom?.multiplier ?? 1,
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
): Omit<RetirementIncomeSource, 'id'> => {
  const derivedFrom =
    vm.incomeCalculationMode === 'DERIVED' && vm.baseIncomeId
      ? { baseIncomeId: vm.baseIncomeId, multiplier: vm.multiplier ?? 1 }
      : undefined;

  return {
    name: vm.name,
    importedFrom: vm.importedFrom,
    incomeCalculationMode: vm.incomeCalculationMode,
    ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
    ...(vm.incomeCategory && { incomeCategory: vm.incomeCategory }),
    ...(derivedFrom && { derivedFrom }),
    type: vm.type,
    baseAmount: vm.baseAmount,
    growthRate: vm.growthRate,
    startYear: vm.startYear,
    endYear: vm.endYear,
    ...(vm.note && { note: vm.note }),
  };
};

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
  calculationMode: z.enum(CalculationMode).default(CalculationMode.FIXED),
  // FIXED mode
  baseAmount: z.number().finite(),
  growthRate: z.number().finite(),
  retirementMultiplier: z.number().finite(), // stored as 0–100 in the form
  // SALARY_PERCENTAGE mode
  salaryPercentage: z.number().min(0).max(100).optional(), // stored as 0–100 in the form
  salaryPercentageRetirementMode: z
    .nativeEnum(SalaryPercentageRetirementMode)
    .default(SalaryPercentageRetirementMode.MANUAL_FALLBACK),
  linkedIncomeId: z.string().optional(),
  fallbackAmount: z.number().finite().optional(),
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
      name: '',
      calculationMode: CalculationMode.FIXED,
      baseAmount: 0,
      growthRate: 2,
      retirementMultiplier: 70,
      salaryPercentage: 35,
      salaryPercentageRetirementMode: SalaryPercentageRetirementMode.MANUAL_FALLBACK,
      fallbackAmount: 0,
      startYear: year,
      endYear: '',
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
    };
  }

  // Infer mode from legacy percentOfSalary if calculationMode absent
  const mode =
    domain.calculationMode ??
    ((domain.percentOfSalary ?? 0) > 0 ? CalculationMode.SALARY_PERCENTAGE : CalculationMode.FIXED);

  return {
    name: domain.name,
    sourceDebtAccountId: domain.sourceDebtAccountId,
    type: domain.type ?? RetirementExpenseType.GENERAL,
    includesPrincipal: domain.includesPrincipal ?? false,
    interestOnly: domain.interestOnly ?? false,
    calculatedFrom: domain.calculatedFrom,
    calculationMode: mode,
    baseAmount: domain.baseAmount,
    growthRate: domain.growthRate,
    retirementMultiplier: domain.retirementMultiplier * 100,
    salaryPercentage:
      domain.salaryPercentage != null
        ? domain.salaryPercentage * 100
        : (domain.percentOfSalary ?? 0),
    salaryPercentageRetirementMode:
      domain.salaryPercentageRetirementMode ?? SalaryPercentageRetirementMode.MANUAL_FALLBACK,
    linkedIncomeId: domain.linkedIncomeId,
    fallbackAmount: domain.fallbackAmount ?? 0,
    startYear: domain.startYear,
    endYear: domain.endYear?.toString() || '',
    note: domain.note,
  };
};

export const mapRetirementExpenseVMToDomain = (
  vm: RetirementExpenseFormVM,
): Omit<RetirementExpenseCategory, 'id'> => {
  const isPercentage = vm.calculationMode === CalculationMode.SALARY_PERCENTAGE;
  const manualFallbackAmount =
    isPercentage &&
    vm.salaryPercentageRetirementMode === SalaryPercentageRetirementMode.MANUAL_FALLBACK &&
    (vm.fallbackAmount ?? 0) > 0
      ? vm.fallbackAmount
      : undefined;

  return {
    name: vm.name,
    ...(vm.sourceDebtAccountId && { sourceDebtAccountId: vm.sourceDebtAccountId }),
    type: vm.type,
    includesPrincipal: vm.includesPrincipal,
    interestOnly: vm.interestOnly,
    ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
    calculationMode: vm.calculationMode,
    salaryPercentageRetirementMode: isPercentage
      ? vm.salaryPercentageRetirementMode
      : SalaryPercentageRetirementMode.MANUAL_FALLBACK,
    baseAmount: vm.baseAmount,
    growthRate: vm.growthRate,
    retirementMultiplier: vm.retirementMultiplier / 100,
    salaryPercentage: isPercentage ? (vm.salaryPercentage ?? 35) / 100 : undefined,
    // Preserve explicit "all salary" selection by clearing linkedIncomeId on save.
    linkedIncomeId: isPercentage ? (vm.linkedIncomeId ?? undefined) : undefined,
    fallbackAmount: manualFallbackAmount,
    startYear: vm.startYear,
    endYear: vm.endYear ? parseInt(vm.endYear, 10) : null,
    ...(vm.note && { note: vm.note }),
  };
};

export const RetirementEventFormVMSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  phases: z
    .array(
      z.object({
        name: z.string().min(1),
        startYear: z.string().min(1),
        endYear: z.string().min(1),
        mode: z.enum(CalculationMode),
        amount: z.string().optional(),
        growthRate: z.string().optional(),
        percentage: z.string().optional(),
        linkedIncomeId: z.string().optional(),
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
          mode: CalculationMode.FIXED,
          amount: '',
          growthRate: '0',
          percentage: '0',
          linkedIncomeId: '',
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
          mode: phase.mode,
          amount: phase.amount != null ? String(phase.amount) : '',
          growthRate: phase.growthRate != null ? String(phase.growthRate) : '0',
          percentage: phase.percentage != null ? String(phase.percentage * 100) : '0',
          linkedIncomeId: phase.linkedIncomeId || '',
        }))
      : [
          {
            name: domain.name,
            startYear: String(domain.year ?? year),
            endYear: String(domain.year ?? year),
            mode: CalculationMode.FIXED,
            amount: String(domain.amount ?? 0),
            growthRate: '0',
            percentage: '0',
            linkedIncomeId: '',
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
  calculationMode: vm.phases[0]?.mode ?? CalculationMode.FIXED,
  phases: vm.phases.map((phase) => ({
    name: phase.name,
    startYear: parseInt(phase.startYear, 10),
    endYear: parseInt(phase.endYear, 10),
    mode: phase.mode,
    ...(phase.mode === CalculationMode.FIXED && phase.amount
      ? { amount: parseFloat(phase.amount) }
      : {}),
    ...(phase.mode === CalculationMode.FIXED && phase.growthRate
      ? { growthRate: parseFloat(phase.growthRate) }
      : {}),
    ...(phase.mode === CalculationMode.SALARY_PERCENTAGE && phase.percentage
      ? { percentage: parseFloat(phase.percentage) / 100 }
      : {}),
    ...(phase.mode === CalculationMode.SALARY_PERCENTAGE && phase.linkedIncomeId
      ? { linkedIncomeId: phase.linkedIncomeId }
      : {}),
  })),
  ...(vm.note && { note: vm.note }),
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
