import { RoleEnum } from '@/domains/auth/role';
import { BaseSchema } from '@/schemas';
import { z } from 'zod';

// AccessControl Schema
export const AccessControlCreateSchema = z.object({
  whitelistedEmails: z.array(z.email()),
});

export type AccessControlCreate = z.infer<typeof AccessControlCreateSchema>;

export const AccessControlSchema = BaseSchema.extend(AccessControlCreateSchema.shape);

export type AccessControl = z.infer<typeof AccessControlSchema>;

// UserProfile Schema
export const UserProfileCreateSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(RoleEnum).default(RoleEnum.GUEST),
  householdId: z.string().optional(),
});

export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;

export const UserProfileSchema = BaseSchema.extend(UserProfileCreateSchema.shape);

export type UserProfile = z.infer<typeof UserProfileSchema>;
