import { z } from 'zod';

export const BaseSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type Base = z.infer<typeof BaseSchema>;
