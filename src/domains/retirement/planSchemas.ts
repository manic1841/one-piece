import { z } from 'zod';

import { TimestampSchema } from '@/shared/schemas/date';

import { createAssumptionsSchema, createAssumptionsUpdateSchema } from './assumptions';
import { RetirementSchemaErrorCode } from './errorCodes';
import { LifeEventsSchema } from './lifeEvents';
import { ProjectionRulesSchema } from './projectionRules';

const nameField = z
  .string()
  .trim()
  .min(1, RetirementSchemaErrorCode.NAME_REQUIRED)
  .max(100, RetirementSchemaErrorCode.NAME_TOO_LONG);

const auditShape = {
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
};

export function createRetirementPlanCreateSchema(currentYear: number) {
  return z.object({
    name: nameField,
    assumptions: createAssumptionsSchema(currentYear),
    projectionRules: ProjectionRulesSchema,
    lifeEvents: LifeEventsSchema,
    ...auditShape,
  });
}
export type RetirementPlanCreate = z.infer<ReturnType<typeof createRetirementPlanCreateSchema>>;

/**
 * Update input keeps the same full shape as create except the immutable
 * `birthYear`; there is no partial variant. The stored anchor is supplied for
 * the cross-field checks that still depend on it.
 */
export function createRetirementPlanUpdateSchema(currentYear: number, birthYear: number) {
  return z.object({
    name: nameField,
    assumptions: createAssumptionsUpdateSchema(currentYear, birthYear),
    projectionRules: ProjectionRulesSchema,
    lifeEvents: LifeEventsSchema,
    ...auditShape,
  });
}
export type RetirementPlanUpdate = z.infer<ReturnType<typeof createRetirementPlanUpdateSchema>>;
