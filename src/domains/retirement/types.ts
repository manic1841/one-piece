import { z } from 'zod';

import {
  CalculationMode as CalculationModeEnum,
  RetirementExpenseCategorySchema,
  RetirementExpenseType as RetirementExpenseTypeEnum,
  RetirementIncomeCalculationMode as RetirementIncomeCalculationModeEnum,
  RetirementIncomeImportSource as RetirementIncomeImportSourceEnum,
  RetirementIncomeSourceSchema,
  RetirementIncomeType as RetirementIncomeTypeEnum,
  RetirementOneTimeEventSchema,
  RetirementPlanCreateSchema,
  RetirementPlanSchema,
  RetirementProjectionYearSchema,
  RetirementTransitionMode as RetirementTransitionModeEnum,
  RetirementTransitionSchema,
  RetirementYearLinkMode as RetirementYearLinkModeEnum,
  SalaryPercentageRetirementMode as SalaryPercentageRetirementModeEnum,
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

export type RetirementIncomeCalculationMode = RetirementIncomeCalculationModeEnum;
export const RetirementIncomeCalculationMode = RetirementIncomeCalculationModeEnum;

export type RetirementYearLinkMode = RetirementYearLinkModeEnum;
export const RetirementYearLinkMode = RetirementYearLinkModeEnum;

export type CalculationMode = CalculationModeEnum;
export const CalculationMode = CalculationModeEnum;

export type SalaryPercentageRetirementMode = SalaryPercentageRetirementModeEnum;
export const SalaryPercentageRetirementMode = SalaryPercentageRetirementModeEnum;

export type RetirementExpenseType = RetirementExpenseTypeEnum;
export const RetirementExpenseType = RetirementExpenseTypeEnum;

export type RetirementTransitionMode = RetirementTransitionModeEnum;
export const RetirementTransitionMode = RetirementTransitionModeEnum;

export type RetirementTransition = z.infer<typeof RetirementTransitionSchema>;
