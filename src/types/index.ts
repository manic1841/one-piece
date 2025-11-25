import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    householdId?: string;
}

export interface Household {
    id: string;
    name: string;
    members: string[]; // emails
    budgetAllocations?: BudgetAllocations;
    createdAt: Timestamp;
}

export type ProjectCategory = '生活' | '居住' | '交通' | '保險' | '小孩' | '儲蓄';
export type IncomeCategory = 'salary' | 'bonus' | 'investment' | 'other';

// Budget allocation for a single income source
export interface IncomeBudgetAllocation {
    生活: number;  // percentage
    居住: number;
    交通: number;
    保險: number;
    小孩: number;
    儲蓄: number;  // auto-calculated, remainder goes here
}

// Budget allocations for all income sources
export interface BudgetAllocations {
    salary: IncomeBudgetAllocation;
    bonus: IncomeBudgetAllocation;
    investment: IncomeBudgetAllocation;
    other: IncomeBudgetAllocation;
}

export interface MonthlyBudget {
    householdId: string;
    year: number;
    month: number;
    totalIncome: number;
    incomeBreakdown: {
        [key in IncomeCategory]: number;
    };
    budgets: {
        [key in ProjectCategory]: {
            allocated: number;  // calculated from income * percentage
            spent: number;      // actual spending
        }
    };
    createdAt: Timestamp;
}

export interface Project {
    id: string;
    name: ProjectCategory;
    color: string;
    icon: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    date: Timestamp;
    amount: number;
    type: TransactionType;
    projectId: string;
    category: string;
    subcategory?: string;
    description: string;
    note?: string;
    paymentMethod?: string;
    isExtraordinary?: boolean;
    extraordinaryType?: string;
    incomeSource?: string;
    memberId?: string;
    createdBy: string;
    createdAt: Timestamp;
}

export interface Account {
    id: string;
    name: string;
    type: 'bank' | 'investment' | 'cash';
    currency: 'TWD' | 'USD';
    isActive: boolean;
    balance?: number; // Latest snapshot balance
}

export interface AccountSnapshot {
    date: Timestamp;
    balance: number;
    note?: string;
}

export interface InvestmentHolding {
    symbol: string;
    name: string;
    shares: number;
    averageCost: number;
    totalCost: number;
    type?: 'stock' | 'etf' | 'bond';
    leverageRatio?: number;
}

export interface InvestmentSnapshot {
    date: Timestamp;
    holdings: InvestmentHolding[];
    totalCost: number;
    totalValue: number;
    unrealizedGain: number;
}
