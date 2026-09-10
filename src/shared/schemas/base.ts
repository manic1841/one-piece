import { z } from 'zod';

/**
 * Dependency-neutral base schema. Shared between domain and infra layers
 * without creating a circular dependency on either.
 *
 * Expand step of the BaseSchema expand-contract refactor (#70).
 * The existing `@/infra/schemas/base` remains untouched until migration (#71).
 */
export const BaseSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type Base = z.infer<typeof BaseSchema>;
