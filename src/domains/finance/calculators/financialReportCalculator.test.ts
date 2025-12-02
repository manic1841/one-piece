import { describe, it, expect } from 'vitest';
import {
    calculateIncomeStatement,
    calculateBalanceSheet,
    calculateCashFlowStatement,
    reconcileReports,
} from './financialReportCalculator';



describe('Financial Report Calculator', () => {
    const projects = [
        {
            id: 'p1',
            name: 'Salary Project',
            accounting: {
                incomeStatement: { category: 'income', subcategory: 'Salary' },
                cashFlow: { activity: 'operating', subcategory: 'Salary' },
            },
        },
        {
            id: 'p2',
            name: 'Food Project',
            accounting: {
                incomeStatement: { category: 'expense', subcategory: 'Living' },
                cashFlow: { activity: 'operating', subcategory: 'Living' },
            },
        },
        {
            id: 'p3',
            name: 'Stock Project',
            accounting: {
                balanceSheet: { category: 'asset', subcategory: 'Investment' },
                cashFlow: { activity: 'investing', subcategory: 'Stock' },
            },
        },
        {
            id: 'p4',
            name: 'Loan Project',
            accounting: {
                balanceSheet: { category: 'liability', subcategory: 'LongTerm' },
                cashFlow: { activity: 'financing', subcategory: 'Loan' },
            },
        },
    ];

    describe('calculateIncomeStatement', () => {
        it('should calculate revenue from planned income and other income transactions', () => {
            const plannedIncomes = [
                { amount: 5000, category: 'salary' },
                { amount: 1000, category: 'bonus' },
            ];

            const otherIncomeTransactions = [
                { amount: 200, category: 'Interest', type: 'income' },
            ];

            const projectSnapshots = [];

            const result = calculateIncomeStatement(plannedIncomes, otherIncomeTransactions, projectSnapshots, projects);

            expect(result.revenue.total).toBe(6200); // 5000 + 1000 + 200
            expect(result.revenue.items).toHaveLength(2); // Salary&Bonus, Interest
        });

        it('should calculate expenses from project snapshots', () => {
            const projectSnapshots = [
                { id: 'p2', expense: 300, income: 0 }, // Food Project
            ];

            const result = calculateIncomeStatement([], [], projectSnapshots, projects);

            expect(result.expenses.total).toBe(300);
            expect(result.expenses.items[0].category).toBe('Living');
        });

        it('should calculate net income', () => {
            const plannedIncomes = [{ amount: 1000, category: 'salary' }];
            const projectSnapshots = [{ id: 'p2', expense: 300, income: 0 }];

            const result = calculateIncomeStatement(plannedIncomes, [], projectSnapshots, projects);

            expect(result.netIncome).toBe(700);
        });
    });

    describe('calculateBalanceSheet', () => {
        it('should calculate assets from accounts and project snapshots', () => {
            const accountSnapshots = [
                { id: 'a1', amount: 1000 },
                { id: 'a2', amount: 500 },
            ];

            const projectSnapshots = [
                { id: 'p3', closingBalance: 2000 }, // Stock Project (Asset)
            ];

            const result = calculateBalanceSheet(accountSnapshots, projectSnapshots, projects);

            expect(result.assets.total).toBe(3500); // 1500 (Cash) + 2000 (Investment)
            const cashItem = result.assets.items.find(i => i.category === 'Cash & Equivalents');
            expect(cashItem?.amount).toBe(1500);
        });

        it('should calculate liabilities from project snapshots', () => {
            const projectSnapshots = [
                { id: 'p4', closingBalance: 5000 }, // Loan Project (Liability)
            ];

            const result = calculateBalanceSheet([], projectSnapshots, projects);

            expect(result.liabilities.total).toBe(5000);
        });
    });

    describe('calculateCashFlowStatement', () => {
        it('should calculate cash flow sections based on project net change', () => {
            const projectSnapshots = [
                { id: 'p1', income: 5000, expense: 0 }, // Salary (Operating Inflow)
                { id: 'p2', income: 0, expense: 300 }, // Food (Operating Outflow)
                { id: 'p3', income: 0, expense: 1000 }, // Stock Buy (Investing Outflow)
                { id: 'p4', income: 2000, expense: 0 }, // Loan Received (Financing Inflow)
            ];

            const beginningCash = 1000;
            const result = calculateCashFlowStatement(projectSnapshots, projects, beginningCash);

            expect(result.operating.netAmount).toBe(4700); // 5000 - 300
            expect(result.investing.netAmount).toBe(-1000); // -1000
            expect(result.financing.netAmount).toBe(2000); // 2000

            expect(result.netChange).toBe(5700);
            expect(result.endingBalance).toBe(6700); // 1000 + 5700
        });
    });

    describe('reconcileReports', () => {
        it('should return true if balance sheet cash matches cash flow ending balance', () => {
            const balanceSheet = {
                assets: {
                    items: [{ category: 'Cash & Equivalents', amount: 1000 }],
                },
            };

            const cashFlow = {
                endingBalance: 1000,
            };

            const result = reconcileReports(balanceSheet, cashFlow);
            expect(result.reconciled).toBe(true);
            expect(result.difference).toBe(0);
        });

        it('should return false if there is a discrepancy', () => {
            const balanceSheet = {
                assets: {
                    items: [{ category: 'Cash & Equivalents', amount: 1000 }],
                },
            };

            const cashFlow = {
                endingBalance: 900,
            };

            const result = reconcileReports(balanceSheet, cashFlow);
            expect(result.reconciled).toBe(false);
            expect(result.difference).toBe(100);
        });
    });
});
