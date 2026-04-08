import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

import {
  ProjectCategory,
} from './types/categories';

// [DOMAIN ENTITY]
// IMPORTANT: Project represents a management accounting unit (e.g., a specific business project or category).
// It is used for budgeting, allocation, and financial performance tracking.

export const ProjectCreateSchema = z.object({
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  order: z.number(),
  description: z.string().optional(),
  category: z.nativeEnum(ProjectCategory),
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
