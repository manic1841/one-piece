import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

export const AllocationTemplateItemSchema = z.object({
  projectId: z.string(),
  percentage: z.number(),
});
export type AllocationTemplateItem = z.infer<typeof AllocationTemplateItemSchema>;

export const AllocationTemplateCreateSchema = z.object({
  name: z.string(),
  ledgerCode: z.string(),
  isDefault: z.boolean().default(false),
  items: z.array(AllocationTemplateItemSchema),
  createdBy: z.string(),
});
export type AllocationTemplateCreate = z.infer<typeof AllocationTemplateCreateSchema>;

export const AllocationTemplateSchema = BaseSchema.extend(AllocationTemplateCreateSchema.shape);
export type AllocationTemplate = z.infer<typeof AllocationTemplateSchema>;
