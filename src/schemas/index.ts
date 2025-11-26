import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper schema for Firestore Timestamp
export const TimestampSchema = z.custom<Timestamp>(
    (val) => val instanceof Timestamp,
    { message: 'Must be a Firestore Timestamp' }
);

// Helper schema for Date that can be Timestamp or Date
export const DateOrTimestampSchema = z.union([
    TimestampSchema,
    z.date(),
    z.string().transform((str) => new Date(str))
]);

// UserProfile Schema
export const UserProfileSchema = z.object({
    uid: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    photoURL: z.string().optional(),
    householdId: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Household Schema
export const HouseholdSchema = z.object({
    id: z.string(),
    name: z.string(),
    members: z.array(z.string().email()),
    budgetAllocations: z.any().optional(), // Will define this below
    createdAt: TimestampSchema,
});

export type Household = z.infer<typeof HouseholdSchema>;

// Project Category Schema
export const ProjectCategorySchema = z.enum(['生活', '居住', '交通', '保險', '小孩', '儲蓄']);
export type ProjectCategory = z.infer<typeof ProjectCategorySchema>;

// Income Category Schema
export const IncomeCategorySchema = z.enum(['salary', 'bonus', 'investment', 'other']);
export type IncomeCategory = z.infer<typeof IncomeCategorySchema>;

// Budget Allocation Schemas
export const IncomeBudgetAllocationSchema = z.object({
    生活: z.number().min(0).max(100),
    居住: z.number().min(0).max(100),
    交通: z.number().min(0).max(100),
    保險: z.number().min(0).max(100),
    小孩: z.number().min(0).max(100),
    儲蓄: z.number().min(0).max(100),
});

export type IncomeBudgetAllocation = z.infer<typeof IncomeBudgetAllocationSchema>;

export const BudgetAllocationsSchema = z.object({
    salary: IncomeBudgetAllocationSchema,
    bonus: IncomeBudgetAllocationSchema,
    investment: IncomeBudgetAllocationSchema,
    other: IncomeBudgetAllocationSchema,
});

export type BudgetAllocations = z.infer<typeof BudgetAllocationsSchema>;

// Monthly Budget Schema
export const MonthlyBudgetSchema = z.object({
    householdId: z.string(),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    totalIncome: z.number().min(0),
    incomeBreakdown: z.record(IncomeCategorySchema, z.number()),
    budgets: z.record(
        ProjectCategorySchema,
        z.object({
            allocated: z.number().min(0),
            spent: z.number().min(0),
        })
    ),
    createdAt: TimestampSchema,
});

export type MonthlyBudget = z.infer<typeof MonthlyBudgetSchema>;

// Account Type Schema
export const AccountTypeSchema = z.enum(['bank', 'credit_card', 'cash', 'investment', 'other']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// Account Schema
export const AccountSchema = z.object({
    id: z.string(),
    householdId: z.string(),
    name: z.string().min(1),
    type: AccountTypeSchema,
    currency: z.string(),
    createdAt: TimestampSchema,
    createdBy: z.string().email(),
});

export type Account = z.infer<typeof AccountSchema>;

// Balance Snapshot Schema
export const BalanceSnapshotSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    householdId: z.string(),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    balance: z.number(),
    recordedAt: TimestampSchema,
    recordedBy: z.string().email(),
});

export type BalanceSnapshot = z.infer<typeof BalanceSnapshotSchema>;

// Access Control Schema
export const AccessControlSchema = z.object({
    whitelistedEmails: z.array(z.string().email()),
    updatedAt: TimestampSchema.optional(),
    updatedBy: z.string().optional(),
});

export type AccessControl = z.infer<typeof AccessControlSchema>;

// Transaction Type Schema
export const TransactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Transaction Schema
export const TransactionSchema = z.object({
    id: z.string(),
    date: DateOrTimestampSchema,
    amount: z.number().positive(),
    type: TransactionTypeSchema,
    projectId: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    description: z.string(),
    note: z.string().optional(),
    paymentMethod: z.string().optional(),
    isExtraordinary: z.boolean().optional(),
    extraordinaryType: z.string().optional(),
    incomeSource: z.string().optional(),
    memberId: z.string().optional(),
    createdBy: z.string().email(),
    createdAt: TimestampSchema,
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Investment Holding Schema
export const InvestmentHoldingSchema = z.object({
    symbol: z.string(),
    name: z.string(),
    shares: z.number().positive(),
    averageCost: z.number().positive(),
    totalCost: z.number().positive(),
    type: z.enum(['stock', 'etf', 'bond']).optional(),
    leverageRatio: z.number().optional(),
});

export type InvestmentHolding = z.infer<typeof InvestmentHoldingSchema>;

// Investment Snapshot Schema
export const InvestmentSnapshotSchema = z.object({
    date: TimestampSchema,
    holdings: z.array(InvestmentHoldingSchema),
    totalCost: z.number(),
    totalValue: z.number(),
    unrealizedGain: z.number(),
});

export type InvestmentSnapshot = z.infer<typeof InvestmentSnapshotSchema>;

// Project Schema
export const ProjectSchema = z.object({
    id: z.string(),
    name: ProjectCategorySchema,
    color: z.string(),
    icon: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

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
