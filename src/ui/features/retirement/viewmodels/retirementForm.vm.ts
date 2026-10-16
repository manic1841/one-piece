import { z } from 'zod';

import { calculatePlanProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import { RetirementExpenseType } from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlan,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { optionalNumber, requiredNumber } from '@/shared/schemas/coerce';
import { RetirementFormValidationLabels as M } from '@/ui/constants/retirement/formValidationLabels';

import {
  type RetirementAssumptionsDisplayVM,
  deriveBirthYear,
  deriveCurrentAge,
} from './retirementDisplay.vm';

export type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementOneTimeEvent,
  RetirementPlan,
  RetirementPlanCreate,
};

const currentYear = () => new Date().getFullYear();

/**
 * Retirement form VMs hold **strings** at the field boundary (ADR-0065): inputs
 * are native and RHF-free, so a numeric field arrives as text and the schema
 * coerces it. `z.input` is what the form holds; `z.output` is the typed value
 * the mappers consume. Named coercion helpers keep the empty semantics explicit:
 * a blank field is "missing", not `0`.
 */
const blank = (value: number | null | undefined): string =>
  value === undefined || value === null ? '' : String(value);

/** Integer field (years, ages): numeric coercion plus an integer check. */
const requiredYear = (message: string) =>
  requiredNumber(message).refine((value) => Number.isInteger(value), { error: message });

export const RetirementIncomeFormVMSchema = z.object({
  name: z.string().min(1, M.name),
  // Import provenance, carried read-only through the form: an edit must never
  // destroy the ledger link (#133), so it rides along in the form values.
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
  lifelong: z.boolean().default(false),
  /** Import-derived; shown read-only. */
  currentAnnual: z.number().finite().nullable(),
  retirementAnnual: optionalNumber(M.validAmount),
  growthRate: optionalNumber(M.growthRate),
  startYear: requiredYear(M.startYear),
  endYear: optionalNumber(M.endYear),
  note: z.string().optional(),
});

export type RetirementIncomeFormInput = z.input<typeof RetirementIncomeFormVMSchema>;
export type RetirementIncomeFormVM = z.output<typeof RetirementIncomeFormVMSchema>;

export const buildRetirementIncomeFormInput = (
  domain: RetirementIncomeSource | undefined,
  currentYearValue = currentYear(),
): RetirementIncomeFormInput => {
  if (!domain) {
    return {
      name: '',
      type: 'salary',
      lifelong: false,
      currentAnnual: null,
      retirementAnnual: '',
      growthRate: '',
      startYear: String(currentYearValue),
      endYear: String(currentYearValue + 20),
    };
  }

  return {
    name: domain.name,
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    type: domain.type,
    lifelong: domain.lifelong ?? false,
    currentAnnual: domain.currentAnnual,
    retirementAnnual: blank(domain.retirementAnnual),
    growthRate: blank(domain.growthRate),
    startYear: String(domain.startYear),
    endYear: blank(domain.endYear),
    note: domain.note,
  };
};

export const mapRetirementIncomeVMToDomain = (
  vm: RetirementIncomeFormVM,
): Omit<RetirementIncomeSource, 'id'> => ({
  name: vm.name,
  ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
  ...(vm.incomeCategory && { incomeCategory: vm.incomeCategory }),
  type: vm.type,
  lifelong: vm.lifelong,
  currentAnnual: vm.currentAnnual,
  ...(vm.retirementAnnual !== undefined && { retirementAnnual: vm.retirementAnnual }),
  ...(vm.growthRate !== undefined && { growthRate: vm.growthRate }),
  startYear: vm.startYear,
  ...(typeof vm.endYear === 'number' && { endYear: vm.endYear }),
  ...(vm.note && { note: vm.note }),
});

export const RetirementExpenseFormVMSchema = z
  .object({
    name: z.string().min(1, M.name),
    // Debt-derived provenance, read-only in the form.
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
    currentAnnual: requiredNumber(M.currentAnnual),
    growthRate: optionalNumber(M.growthRate),
    retirementMultiplier: requiredNumber(M.retirementMultiplier), // stored as 0–100 in the form
    startYear: requiredYear(M.startYear),
    endYear: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // A debt-payment category inherits its end date from the repayment schedule,
    // so the field is required for that category only. Cross-field rule, so it
    // lives in the schema rather than in the component.
    if (value.type === RetirementExpenseType.DEBT_PAYMENT && !value.endYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.endYear,
        path: ['endYear'],
      });
    }
  });

export type RetirementExpenseFormInput = z.input<typeof RetirementExpenseFormVMSchema>;
export type RetirementExpenseFormVM = z.output<typeof RetirementExpenseFormVMSchema>;

export const buildRetirementExpenseFormInput = (
  domain: RetirementExpenseCategory | undefined,
  currentYearValue = currentYear(),
): RetirementExpenseFormInput => {
  if (!domain) {
    return {
      name: '',
      currentAnnual: '',
      growthRate: '',
      retirementMultiplier: '70',
      startYear: String(currentYearValue),
      endYear: '',
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
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
    currentAnnual: String(domain.currentAnnual),
    growthRate: blank(domain.growthRate),
    retirementMultiplier: String(domain.retirementMultiplier * 100),
    startYear: String(domain.startYear),
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
  name: z.string().min(1, M.eventName),
  type: z.enum(['income', 'expense']),
  phases: z
    .array(
      z.object({
        name: z.string().min(1, M.phaseName),
        startYear: requiredYear(M.startYear),
        endYear: requiredYear(M.endYear),
        amount: requiredNumber(M.eventAmount),
        growthRate: optionalNumber(M.growthRate),
      }),
    )
    .min(1, M.atLeastOnePhase),
  note: z.string().optional(),
});

export type RetirementEventFormInput = z.input<typeof RetirementEventFormVMSchema>;
export type RetirementEventFormVM = z.output<typeof RetirementEventFormVMSchema>;

export const buildRetirementEventFormInput = (
  domain: RetirementOneTimeEvent | undefined,
  currentYearValue = currentYear(),
): RetirementEventFormInput => {
  if (!domain) {
    return {
      name: '',
      type: 'expense',
      phases: [
        {
          name: 'Phase 1',
          startYear: currentYearValue.toString(),
          endYear: currentYearValue.toString(),
          amount: '',
          growthRate: '',
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
            startYear: String(domain.year ?? currentYearValue),
            endYear: String(domain.year ?? currentYearValue),
            amount: String(domain.amount ?? 0),
            growthRate: '',
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
    startYear: phase.startYear,
    endYear: phase.endYear,
    amount: phase.amount,
    ...(phase.growthRate !== undefined ? { growthRate: phase.growthRate } : {}),
  })),
  ...(vm.note && { note: vm.note }),
});

export const RetirementAssumptionsFormVMSchema = z
  .object({
    currentAge: requiredYear(M.currentAge).refine((value) => value > 0, { error: M.currentAge }),
    retirementAge: requiredYear(M.retirementAge).refine((value) => value > 0, {
      error: M.retirementAge,
    }),
    lifeExpectancy: requiredYear(M.lifeExpectancy).refine((value) => value > 0, {
      error: M.lifeExpectancy,
    }),
    inflationRate: requiredNumber(M.inflationRate),
    investmentReturnRate: requiredNumber(M.investmentReturnRate),
  })
  .superRefine((value, ctx) => {
    // 人生時程 ordering: 目前年 < 退休年 < 預期壽命 (cross-field, so it lives here).
    if (value.retirementAge <= value.currentAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.retirementAgeOrder,
        path: ['retirementAge'],
      });
    }
    if (value.lifeExpectancy <= value.retirementAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.lifeExpectancyOrder,
        path: ['lifeExpectancy'],
      });
    }
  });

export type RetirementAssumptionsFormInput = z.input<typeof RetirementAssumptionsFormVMSchema>;
export type RetirementAssumptionsFormVM = z.output<typeof RetirementAssumptionsFormVMSchema>;

export const buildRetirementAssumptionsFormInput = (
  assumptions: RetirementAssumptionsDisplayVM,
): RetirementAssumptionsFormInput => ({
  currentAge: String(assumptions.currentAge),
  retirementAge: String(assumptions.retirementAge),
  lifeExpectancy: String(assumptions.lifeExpectancy),
  inflationRate: String(assumptions.inflationRate),
  investmentReturnRate: String(assumptions.investmentReturnRate),
});

/**
 * Save mapper: `currentYear` is refreshed to "today" on every save, and `birthYear`
 * is re-anchored from the (possibly edited) 目前年齡 — so an untouched age round-trips
 * to the same birth year. See CONTEXT.md 目前年齡.
 */
export const mapRetirementAssumptionsVMToPlanUpdates = (
  vm: RetirementAssumptionsFormVM,
  baseYear = currentYear(),
): Partial<RetirementPlanCreate> => ({
  currentYear: baseYear,
  birthYear: deriveBirthYear(vm.currentAge, baseYear),
  retirementAge: vm.retirementAge,
  lifeExpectancy: vm.lifeExpectancy,
  inflationRate: vm.inflationRate,
  investmentReturnRate: vm.investmentReturnRate,
});

/** The picked figures the inline assumption preview renders (spec #301 §3.3). */
export interface RetirementAssumptionPreviewVM {
  /** 最終資產 — the closing balance in the projection's final year. */
  finalNetWorth: number;
  /** 最低資產 — the smallest closing balance across the projection. */
  minSavings: number;
  /** The year 最低資產 occurs in. */
  minYear: number;
}

/** Lenient coercion: a blank or unparsable field keeps the plan's current value. */
const draftNumber = (raw: string | number | undefined, fallback: number): number => {
  if (raw === undefined) return fallback;
  if (typeof raw === 'number') return raw;
  if (raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isNaN(value) ? fallback : value;
};

/**
 * Draft-only projection (spec #301 §3.3): folds the live assumption draft over the
 * current plan to build an unpersisted plan object, then runs the pure projection
 * engine. Nothing here is written — the caller only displays the picked figures, so
 * no schema field is added and nothing is persisted before save.
 */
export const calculateRetirementAssumptionPreview = (
  plan: RetirementPlan,
  startingNetWorth: number,
  draft: RetirementAssumptionsFormInput,
): RetirementAssumptionPreviewVM => {
  const baseYear = currentYear();
  const draftPlan: RetirementPlan = {
    ...plan,
    currentYear: baseYear,
    birthYear: deriveBirthYear(
      draftNumber(draft.currentAge, deriveCurrentAge(plan.birthYear, baseYear)),
      baseYear,
    ),
    retirementAge: draftNumber(draft.retirementAge, plan.retirementAge),
    lifeExpectancy: draftNumber(draft.lifeExpectancy, plan.lifeExpectancy),
    inflationRate: draftNumber(draft.inflationRate, plan.inflationRate),
    investmentReturnRate: draftNumber(draft.investmentReturnRate, plan.investmentReturnRate),
  };

  const projection = calculatePlanProjection(draftPlan, startingNetWorth);
  const last = projection[projection.length - 1];
  let minPoint = projection[0];
  for (const point of projection) {
    if (point.savings < minPoint.savings) minPoint = point;
  }

  return {
    finalNetWorth: last?.savings ?? 0,
    minSavings: minPoint?.savings ?? 0,
    minYear: minPoint?.year ?? baseYear,
  };
};
