import { z } from 'zod';
import { RoleEnum } from '../domains/core/role';
import { Timestamp } from 'firebase/firestore';

export * from './account';
export * from './project';
export * from './transaction';
export * from './plannedIncome';
export * from './portfolio';
export * from './incomeStatement';
export * from './balanceSheet';
export * from './cashFlow';

export const convertToDate = (value: Timestamp): Date => {
  // 檢查是否包含 toDate 函式 (Firestore Timestamp 的特徵)
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  throw new Error('Invalid Timestamp');
};

// AccessControl Schema
export const AccessControlSchema = z.object({
  whitelistedEmails: z.array(z.email()),
  updatedAt: z.date().optional(),
  updatedBy: z.string().optional(),
});

export type AccessControl = z.infer<typeof AccessControlSchema>;

// UserProfile Schema
export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(RoleEnum).default(RoleEnum.GUEST),
  householdId: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.record(
    z.string(),
    z.object({
      role: z.enum(RoleEnum).default(RoleEnum.GUEST),
      joinedAt: z.date(),
    }),
  ),
  createdAt: z.date(),
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
