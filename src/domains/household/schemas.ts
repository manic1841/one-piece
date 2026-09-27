import { z } from 'zod';

import { RoleEnum } from '@/domains/household/role';
import { BaseSchema } from '@/shared/schemas/base';

export const HouseholdCreateSchema = z.object({
  name: z.string(),
  memberUids: z.array(z.string()).default([]),
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
