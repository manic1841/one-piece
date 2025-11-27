import { z } from 'zod';
import { TimestampSchema } from './helper';

// ProjectSnapshot Schema
export const ProjectSnapshotSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number(),
  openingBalance: z.number(),
  income: z.number(),
  expense: z.number(),
  closingBalance: z.number(),
  createdAt: TimestampSchema,
});

export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;

// Project Schema
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  description: z.string().optional(),
  isPersonal: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: TimestampSchema.optional(),
  // subcollection
  snapshots: z.array(ProjectSnapshotSchema).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ProjectTransactionType Schema
export const ProjectTransactionTypeSchema = z.enum(['allocation', 'transfer', 'adjustment']);

export type ProjectTransactionType = z.infer<typeof ProjectTransactionTypeSchema>;

// ProjectTransaction Schema
export const ProjectTransactionSchema = z.object({
  id: z.string(),
  date: z.union([TimestampSchema, z.instanceof(Date)]),
  type: ProjectTransactionTypeSchema,
  fromProject: z.string().nullable().optional(),
  toProject: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  incomeSource: z.string().optional(),
  createdBy: z.string(),
  createdAt: TimestampSchema,
});

export type ProjectTransaction = z.infer<typeof ProjectTransactionSchema>;
