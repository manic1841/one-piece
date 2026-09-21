import { z } from 'zod';

import {
  RetirementExpenseCategorySchema,
  RetirementExpenseType as RetirementExpenseTypeEnum,
  RetirementIncomeImportSource as RetirementIncomeImportSourceEnum,
  RetirementIncomeSourceSchema,
  RetirementIncomeType as RetirementIncomeTypeEnum,
  RetirementOneTimeEventSchema,
  RetirementPlanCreateSchema,
  RetirementPlanSchema,
  RetirementProjectionYearSchema,
  RetirementYearLinkMode as RetirementYearLinkModeEnum,
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

export type RetirementYearLinkMode = RetirementYearLinkModeEnum;
export const RetirementYearLinkMode = RetirementYearLinkModeEnum;

export type RetirementExpenseType = RetirementExpenseTypeEnum;
export const RetirementExpenseType = RetirementExpenseTypeEnum;
