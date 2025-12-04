import { z } from 'zod';

// UserProfile Schema
export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  householdId: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Household Schema
export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.email()),
  budgetAllocations: z.any().optional(), // Will define this below
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type Household = z.infer<typeof HouseholdSchema>;

// Access Control Schema
export const AccessControlSchema = z.object({
  whitelistedEmails: z.array(z.email()),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
});

export type AccessControl = z.infer<typeof AccessControlSchema>;
