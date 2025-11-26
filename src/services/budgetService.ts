import {
    doc,
    getDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    type BudgetAllocations,
    type IncomeBudgetAllocation,
    type MonthlyBudget,
    type ProjectCategory,
    type IncomeCategory
} from '../types';
import { transactionService } from './transactionService';
import { Timestamp } from 'firebase/firestore';

const DEFAULT_ALLOCATION: IncomeBudgetAllocation = {
    '生活': 0,
    '居住': 0,
    '交通': 0,
    '保險': 0,
    '小孩': 0,
    '儲蓄': 100  // default savings
};

const DEFAULT_ALLOCATIONS: BudgetAllocations = {
    salary: { ...DEFAULT_ALLOCATION },
    bonus: { ...DEFAULT_ALLOCATION },
    investment: { ...DEFAULT_ALLOCATION },
    other: { ...DEFAULT_ALLOCATION }
};

export type MonthlyCategoryStat = {
    category: ProjectCategory;
    percentage: number;
    allocated: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
};
export type MonthlyBudgetStats = {
    totalIncome: number;
    incomeBreakdown: Record<IncomeCategory, number>;
    stats: MonthlyCategoryStat[];
};

export const budgetService = {
    // Get household's budget allocations
    async getBudgetAllocations(householdId: string): Promise<BudgetAllocations> {
        const householdRef = doc(db, 'households', householdId);
        const householdSnap = await getDoc(householdRef);

        if (householdSnap.exists()) {
            const data = householdSnap.data();
            return data.budgetAllocations || DEFAULT_ALLOCATIONS;
        }

        return DEFAULT_ALLOCATIONS;
    },

    // Update household's budget allocations for a specific income source
    async updateBudgetAllocations(householdId: string, allocations: BudgetAllocations): Promise<void> {
        // Validate that each income source's allocations sum to 100%
        for (const incomeType of Object.keys(allocations) as IncomeCategory[]) {
            const allocation = allocations[incomeType];
            const total = (Object.values(allocation) as number[]).reduce((sum: number, val: number) => sum + val, 0);
            if (Math.abs(total - 100) > 0.01) {
                throw new Error(`Budget allocations for ${incomeType} must sum to 100% (currently ${total.toFixed(1)}%)`);
            }
        }

        const householdRef = doc(db, 'households', householdId);
        await updateDoc(householdRef, {
            budgetAllocations: allocations
        });
    },

    // Calculate monthly budget based on income
    async calculateMonthlyBudget(householdId: string, year: number, month: number): Promise<MonthlyBudget> {
        // Get budget allocations
        const allocations = await this.getBudgetAllocations(householdId);

        // Get monthly transactions
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const allTransactions = await transactionService.getTransactions(householdId, {
            startDate: startDateStr,
            endDate: endDateStr
        });

        // Calculate income breakdown by category
        const incomeBreakdown: Record<IncomeCategory, number> = {
            salary: 0,
            bonus: 0,
            investment: 0,
            other: 0
        };

        allTransactions
            .filter(t => t.type === 'income')
            .forEach(t => {
                const category = t.category as IncomeCategory;
                if (category in incomeBreakdown) {
                    incomeBreakdown[category] += t.amount;
                }
            });

        const totalIncome = Object.values(incomeBreakdown).reduce((sum, val) => sum + val, 0);

        // Calculate budget for each project category
        const budgets: MonthlyBudget['budgets'] = {} as Record<ProjectCategory, { allocated: number; spent: number }>;
        const categories: ProjectCategory[] = ['生活', '居住', '交通', '保險', '小孩', '儲蓄'];

        for (const category of categories) {
            let allocated = 0;

            // Sum up allocations from each income source
            for (const [incomeType, incomeAmount] of Object.entries(incomeBreakdown)) {
                const allocation = allocations[incomeType as IncomeCategory];
                allocated += (incomeAmount * allocation[category]) / 100;
            }

            const spent = allTransactions
                .filter(t => t.type === 'expense' && t.projectId === category)
                .reduce((sum, t) => sum + t.amount, 0);

            budgets[category] = {
                allocated,
                spent
            };
        }

        return {
            householdId,
            year,
            month,
            totalIncome,
            incomeBreakdown,
            budgets,
            createdAt: Timestamp.now()
        };
    },

    // Get monthly statistics (budget vs actual)
    async getMonthlyStats(householdId: string, year: number, month: number): Promise<MonthlyBudgetStats> {
        const monthlyBudget = await this.calculateMonthlyBudget(householdId, year, month);
        const allocations = await this.getBudgetAllocations(householdId);

        // Calculate average allocation percentage for each category
        const avgAllocations: Record<ProjectCategory, number> = {} as Record<ProjectCategory, number>;
        const categories: ProjectCategory[] = ['生活', '居住', '交通', '保險', '小孩', '儲蓄'];

        for (const category of categories) {
            let totalPercentage = 0;
            let totalIncome = 0;

            for (const [incomeType, incomeAmount] of Object.entries(monthlyBudget.incomeBreakdown)) {
                if (incomeAmount > 0) {
                    const allocation = allocations[incomeType as IncomeCategory];
                    totalPercentage += allocation[category] * incomeAmount;
                    totalIncome += incomeAmount;
                }
            }

            avgAllocations[category] = totalIncome > 0 ? totalPercentage / totalIncome : 0;
        }

        const stats = Object.entries(monthlyBudget.budgets).map(([category, data]) => ({
            category: category as ProjectCategory,
            percentage: avgAllocations[category as ProjectCategory],
            allocated: data.allocated,
            spent: data.spent,
            remaining: data.allocated - data.spent,
            percentageUsed: data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0,
            isOverBudget: data.spent > data.allocated
        }));

        return {
            totalIncome: monthlyBudget.totalIncome,
            incomeBreakdown: monthlyBudget.incomeBreakdown,
            stats
        };
    }
};
