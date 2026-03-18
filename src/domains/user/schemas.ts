import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

// UserProfile Schema
export const UserProfileCreateSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  householdId: z.string().optional(),
});

export const UserProfileSchema = BaseSchema.extend(UserProfileCreateSchema.shape);

export type UserProfile = z.infer<typeof UserProfileSchema>;
