import { z } from 'zod';

import { TimestampSchema } from './date';

/**
 * Dependency-neutral base schema. Shared between domain and infra layers
 * without creating a circular dependency on either.
 */
export const BaseSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
  updatedBy: z.string(),
  updatedAt: TimestampSchema,
});

export type Base = z.infer<typeof BaseSchema>;
