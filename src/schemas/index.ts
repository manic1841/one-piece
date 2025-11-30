import { z } from 'zod';
import { TimestampSchema } from './helper';

export * from './account';
export * from './allocation';
export * from './investment';
export * from './project';
export * from './transaction';
export * from './plannedIncome';
export * from './helper';
export * from './portfolio';
export * from './incomeStatement';
export * from './balanceSheet';
export * from './cashFlow';

export const AccessControlSchema = z.object({
  whitelistedEmails: z.array(z.string().email()),
  updatedAt: TimestampSchema.optional(),
  updatedBy: z.string().optional(),
});

export type AccessControl = z.infer<typeof AccessControlSchema>;

export const RoleEnum = z.enum(['owner', 'admin', 'member', 'guest']);

export type Role = z.infer<typeof RoleEnum>;

// UserProfile Schema
export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: RoleEnum.default('guest'),
  householdId: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.record(
    z.string(),
    z.object({
      role: RoleEnum.default('guest'),
      joinedAt: TimestampSchema,
    }),
  ),
  createdAt: TimestampSchema,
});

export type Household = z.infer<typeof HouseholdSchema>;

// Helper function to safely parse and validate data
export function parseWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schema validation error:', error.issues);
      throw new Error(`Data validation failed: ${error.issues.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Helper function to safely parse with fallback
export function parseWithSchemaOptional<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('Schema validation warning:', error.issues);
      return null;
    }
    throw error;
  }
}
