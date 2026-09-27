import { z } from 'zod';

import { BaseSchema } from '@/shared/schemas/base';

// [DOMAIN ENTITY]
// Project represents a management accounting unit: a purpose or budget pool
// tracked by allocation and settlement. Core fields are name and isActive;
// order exists for system-managed ordering (reorder transactions).

export const ProjectCreateSchema = z.object({
  name: z.string(),
  order: z.number(),
  isActive: z.boolean().default(true),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectSchema = BaseSchema.extend(ProjectCreateSchema.shape);
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectSnapshotCreateSchema = z.object({
  year: z.number(),
  month: z.number(),
  openingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  closingBalance: z.number(),
});

export type ProjectSnapshotCreate = z.infer<typeof ProjectSnapshotCreateSchema>;

export const ProjectSnapshotSchema = BaseSchema.extend(ProjectSnapshotCreateSchema.shape);
export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;

export type ProjectWithSnapshot = Project & { snapshot: ProjectSnapshot | null };
