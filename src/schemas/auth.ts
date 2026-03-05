import { z } from 'zod';

import { BaseSchema } from '@/schemas/base';

// AccessControl Schema
// whitelist
export const AccessControlWhitelistSchema = z.object({
  emails: z.array(z.email()),
});

export type AccessControlWhitelist = z.infer<typeof AccessControlWhitelistSchema>;

// UserProfile Schema
export const UserProfileCreateSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  householdId: z.string().optional(),
});

export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;

export const UserProfileSchema = BaseSchema.extend(UserProfileCreateSchema.shape);

export type UserProfile = z.infer<typeof UserProfileSchema>;
