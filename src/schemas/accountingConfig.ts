import { z } from 'zod';
import { TimestampSchema } from './helper';

// Defines the accounting categories users can choose from
export const AccountingCategorySchema = z.enum([
  '生活', // Living
  '居住', // Housing
  '交通', // Transportation
  '保險', // Insurance
  '利息', // Interest
  '稅', // Tax
  '其他', // Other
]);

export type AccountingCategory = z.infer<typeof AccountingCategorySchema>;

// Configuration mapping projects to accounting categories
export const AccountingConfigSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  projectMappings: z.record(z.string(), AccountingCategorySchema), // projectId -> category
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: z.string(),
});

export type AccountingConfig = z.infer<typeof AccountingConfigSchema>;
