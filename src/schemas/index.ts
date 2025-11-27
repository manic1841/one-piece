import { z } from 'zod';
import { TimestampSchema } from './helper';

// Access Control Schema
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

// Household Schema
export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(
    z.object({
      uid: z.string(),
      name: z.string(),
      role: RoleEnum.default('guest'),
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
