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
    createdAt: Timestamp;
}

export interface Project {
    id: string;
    name: string;
    budgetPercentage: number;
    color: string;
    icon: string;
    categories: string[];
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
