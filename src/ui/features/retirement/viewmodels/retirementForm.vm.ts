import { z } from 'zod';

import { RetirementExpenseType } from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
  type RetirementPlanCreate,
} from '@/domains/retirement/types';
import { optionalNumber, requiredNumber } from '@/shared/schemas/coerce';
import { RetirementFormValidationLabels as M } from '@/ui/constants/retirement/formValidationLabels';
import {
  type RetirementEndCondition,
  RetirementEndConditionLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';

import { type RetirementAssumptionsDisplayVM, deriveBirthYear } from './retirementDisplay.vm';

export type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementOneTimeEvent,
  RetirementPlanCreate,
};

export type { RetirementEndCondition };

/**
 * 結束語意的回推（保守）：`lifelong` 或未設 `endYear` → 持續至預期壽命；
 * `endYear === 退休年` → 退休時結束；其餘 → 指定年份。
 * 「指定年齡」不回推（不保證 round-trip）。
 */
export const deriveRetirementEndCondition = (
  data: { lifelong?: boolean; endYear?: number | null },
  retirementYear: number,
): RetirementEndCondition => {
  if (data.lifelong || data.endYear == null) return 'lifelong';
  return data.endYear === retirementYear ? 'retirement' : 'year';
};

/** 語意 → 顯示標籤（純函式即時推導）。 */
export const retirementEndConditionText = (
  condition: RetirementEndCondition,
  value?: string | number,
): string => {
  const numeric = value === '' || value == null ? null : value;
  if (condition === 'age' && numeric != null) return `指定年齡 ${numeric}`;
  if (condition === 'year' && numeric != null) return `指定年份 ${numeric}`;
  return RetirementEndConditionLabels[condition];
};

/** 收入類型的預設結束語意：Salary → 退休時結束；其餘 → 持續至預期壽命。 */
export const defaultIncomeEndCondition = (
  type: 'salary' | 'bonus' | 'pension' | 'rent' | 'other',
): RetirementEndCondition => (type === 'salary' ? 'retirement' : 'lifelong');

/**
 * 編輯時選、儲存時塌縮：四語意 → 具體 `{ lifelong, endYear }`。
 * 「指定年齡 N」以 `birthYear` 轉成絕對年份；`startYear` 不帶語意。
 */
export const collapseRetirementEndCondition = (
  condition: RetirementEndCondition,
  value: string | number | undefined,
  { birthYear, retirementYear }: { birthYear: number; retirementYear: number },
): { lifelong: boolean; endYear?: number } => {
  if (condition === 'lifelong') return { lifelong: true };
  if (condition === 'retirement') return { lifelong: false, endYear: retirementYear };
  const numeric = Number(value);
  return {
    lifelong: false,
    endYear: condition === 'age' ? birthYear + numeric : numeric,
  };
};

/** 需輸入數值（年齡或年份）的語意。 */
const needsEndConditionValue = (condition: RetirementEndCondition): boolean =>
  condition === 'age' || condition === 'year';

const isIntegerText = (value: string | undefined): boolean =>
  value != null && value !== '' && Number.isInteger(Number(value));

/** 側邊編輯器需要的時間錨點（由 plan 假設推導）。 */
export interface RetirementEntryAnchor {
  birthYear: number;
  retirementYear: number;
}

/** 表單初始化需要的年份（不需要 birthYear）。 */
export interface RetirementEntryBuildAnchor {
  currentYear?: number;
  retirementYear: number;
}

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

export const RetirementIncomeFormVMSchema = z
  .object({
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
    /** Import-derived; shown read-only. */
    currentAnnual: z.number().finite().nullable(),
    growthRate: optionalNumber(M.growthRate),
    startYear: requiredYear(M.startYear),
    /** 結束條件語意（編輯時選、儲存時塌縮為 endYear／lifelong）。 */
    endCondition: z.enum(['retirement', 'age', 'year', 'lifelong']),
    /** 指定年齡或指定年份的原始輸入（字串邊界，ADR-0065）。 */
    endConditionValue: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (needsEndConditionValue(value.endCondition) && !isIntegerText(value.endConditionValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.endConditionValue,
        path: ['endConditionValue'],
      });
    }
  });

export type RetirementIncomeFormInput = z.input<typeof RetirementIncomeFormVMSchema>;
export type RetirementIncomeFormVM = z.output<typeof RetirementIncomeFormVMSchema>;

export const buildRetirementIncomeFormInput = (
  domain: RetirementIncomeSource | undefined,
  { currentYear: currentYearValue = currentYear(), retirementYear }: RetirementEntryBuildAnchor,
): RetirementIncomeFormInput => {
  if (!domain) {
    return {
      name: '',
      type: 'salary',
      currentAnnual: null,
      growthRate: '',
      startYear: String(currentYearValue),
      endCondition: 'retirement',
      endConditionValue: '',
    };
  }

  const endCondition = deriveRetirementEndCondition(domain, retirementYear);
  return {
    name: domain.name,
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    type: domain.type,
    currentAnnual: domain.currentAnnual,
    growthRate: blank(domain.growthRate),
    startYear: String(domain.startYear),
    endCondition,
    endConditionValue: endCondition === 'year' ? String(domain.endYear ?? '') : '',
    note: domain.note,
  };
};

export const mapRetirementIncomeVMToDomain = (
  vm: RetirementIncomeFormVM,
  {
    birthYear,
    retirementYear,
    retirementAnnual,
  }: RetirementEntryAnchor & {
    retirementAnnual?: number;
  },
): Omit<RetirementIncomeSource, 'id'> => {
  const collapsed = collapseRetirementEndCondition(vm.endCondition, vm.endConditionValue, {
    birthYear,
    retirementYear,
  });
  return {
    name: vm.name,
    ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
    ...(vm.incomeCategory && { incomeCategory: vm.incomeCategory }),
    type: vm.type,
    lifelong: collapsed.lifelong,
    currentAnnual: vm.currentAnnual,
    // 退休後水準退出 UI：保留既有值，不由表單改寫（架構不變）。
    ...(retirementAnnual !== undefined && { retirementAnnual }),
    ...(vm.growthRate !== undefined && { growthRate: vm.growthRate }),
    startYear: vm.startYear,
    ...(collapsed.endYear !== undefined && { endYear: collapsed.endYear }),
    ...(vm.note && { note: vm.note }),
  };
};

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
    startYear: requiredYear(M.startYear),
    /** 結束條件語意；Debt Payment 固定為 `year`（endYear 由匯入）。 */
    endCondition: z.enum(['retirement', 'age', 'year', 'lifelong']),
    endConditionValue: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // 指定年齡／指定年份需要具體數值；Debt Payment 的年份由匯入帶入，同樣走這裡。
    if (needsEndConditionValue(value.endCondition) && !isIntegerText(value.endConditionValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: M.endConditionValue,
        path: ['endConditionValue'],
      });
    }
  });

export type RetirementExpenseFormInput = z.input<typeof RetirementExpenseFormVMSchema>;
export type RetirementExpenseFormVM = z.output<typeof RetirementExpenseFormVMSchema>;

export const buildRetirementExpenseFormInput = (
  domain: RetirementExpenseCategory | undefined,
  { currentYear: currentYearValue = currentYear(), retirementYear }: RetirementEntryBuildAnchor,
): RetirementExpenseFormInput => {
  if (!domain) {
    return {
      name: '',
      currentAnnual: '',
      growthRate: '',
      startYear: String(currentYearValue),
      type: RetirementExpenseType.GENERAL,
      includesPrincipal: false,
      interestOnly: false,
      endCondition: 'lifelong',
      endConditionValue: '',
    };
  }

  const endCondition = deriveRetirementEndCondition(domain, retirementYear);
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
    startYear: String(domain.startYear),
    endCondition,
    endConditionValue: endCondition === 'year' ? String(domain.endYear ?? '') : '',
    note: domain.note,
  };
};

export const mapRetirementExpenseVMToDomain = (
  vm: RetirementExpenseFormVM,
  {
    birthYear,
    retirementYear,
    retirementMultiplier,
  }: RetirementEntryAnchor & {
    retirementMultiplier: number;
  },
): Omit<RetirementExpenseCategory, 'id'> => {
  const collapsed = collapseRetirementEndCondition(vm.endCondition, vm.endConditionValue, {
    birthYear,
    retirementYear,
  });
  return {
    name: vm.name,
    ...(vm.sourceDebtAccountId && { sourceDebtAccountId: vm.sourceDebtAccountId }),
    type: vm.type,
    includesPrincipal: vm.includesPrincipal,
    interestOnly: vm.interestOnly,
    ...(vm.calculatedFrom && { calculatedFrom: vm.calculatedFrom }),
    ...(vm.expenseCategory && { expenseCategory: vm.expenseCategory }),
    currentAnnual: vm.currentAnnual,
    ...(vm.growthRate !== undefined && { growthRate: vm.growthRate }),
    // 退休後水準退出 UI：保留既有值（新列預設 100%），架構不變。
    retirementMultiplier,
    startYear: vm.startYear,
    endYear: collapsed.endYear ?? null,
    ...(vm.note && { note: vm.note }),
  };
};

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
