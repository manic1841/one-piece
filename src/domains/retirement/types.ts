import { z } from 'zod';

import { createRetirementPlanCreateSchema, createRetirementPlanUpdateSchema } from './schemas';

export type RetirementPlanCreate = z.infer<ReturnType<typeof createRetirementPlanCreateSchema>>;
export type RetirementPlanUpdate = z.infer<ReturnType<typeof createRetirementPlanUpdateSchema>>;

/** Persisted plan: the create shape plus its document id. */
export type RetirementPlan = RetirementPlanCreate & { id: string };
