import { z } from 'zod';

import { TimestampSchema } from '@/shared/schemas/date';

import {
  RetirementAssumptionsSchema,
  createAssumptionsSchema,
  createAssumptionsUpdateSchema,
} from '../assumptions';
import { LifeEventsSchema } from '../lifeEvents';
import { retirementNameSchema } from '../name';
import { ProjectionRulesSchema } from '../projectionRules';

const nameField = retirementNameSchema;

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

/**
 * Clock-free persisted shape. Persistence parses reads with this; the
 * current-year bound and the cross-field timing checks belong to the use case
 * that owns the clock, through the factory schemas above.
 */
export const RetirementPlanSchema = z.object({
  id: z.string(),
  name: nameField,
  assumptions: RetirementAssumptionsSchema,
  projectionRules: ProjectionRulesSchema,
  lifeEvents: LifeEventsSchema,
  ...auditShape,
});
