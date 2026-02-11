import { z } from 'zod';

import { RoleEnum } from '@/domains/auth/role';
import { BaseSchema } from '@/schemas';

export const HouseholdCreateSchema = z.object({
  name: z.string(),
  members: z.record(
    z.string(),
    z.object({
      role: z.enum(RoleEnum).default(RoleEnum.GUEST),
      joinedAt: z.date(),
    }),
  ),
});

export type HouseholdCreate = z.infer<typeof HouseholdCreateSchema>;

export const HouseholdSchema = BaseSchema.extend(HouseholdCreateSchema.shape);

export type Household = z.infer<typeof HouseholdSchema>;
