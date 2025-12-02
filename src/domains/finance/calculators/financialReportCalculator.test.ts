import { describe, it, expect } from 'vitest';
import {
    calculateIncomeStatement,
    calculateBalanceSheet,
    calculateCashFlowStatement,
    reconcileReports,
} from './financialReportCalculator';
import { PlannedIncome } from '../../../schemas/plannedIncome';
import { createPlannedIncome, createTransaction, createProjectSnapshot, createProject, createAccountSnapshot } from '../../../tests/factories';
import { createBalanceSheetData, createBalanceSheetItem, createCashFlowData } from '../../../tests/reportFactories';


describe('Financial Report Calculator', () => {
    const projects = [
        createProject({
            id: 'p1',
            name: 'Salary Project',
            accounting: {
                enabled: true,
                incomeStatement: { category: 'income', subcategory: 'Salary' },
                cashFlow: { activity: 'operating', subcategory: 'Salary' },
            },
        }),
        createProject({
            id: 'p2',
            name: 'Food Project',
            accounting: {
                enabled: true,
                incomeStatement: { category: 'expense', subcategory: 'Living' },
                cashFlow: { activity: 'operating', subcategory: 'Living' },
            },
        }),
        createProject({
            id: 'p3',
            name: 'Stock Project',
            accounting: {
                enabled: true,
                balanceSheet: { category: 'asset', subcategory: 'investment' },
                cashFlow: { activity: 'investing', subcategory: 'Stock' },
            },
        }),
        createProject({
            id: 'p4',
            name: 'Loan Project',
            accounting: {
                enabled: true,
                balanceSheet: { category: 'liability', subcategory: 'longTerm' },
                cashFlow: { activity: 'financing', subcategory: 'loan' },
            },
        }),
    ];

    describe('calculateIncomeStatement', () => {
        it('should calculate revenue from planned income and other income transactions', () => {
            const plannedIncomes: PlannedIncome[] = [
                createPlannedIncome({ amount: 5000, category: 'salary' }),
                createPlannedIncome({ amount: 1000, category: 'bonus' }),
            ];

            const otherIncomeTransactions = [
                createTransaction({ amount: 200, category: 'Interest', type: 'income' }),
            ];

            const result = calculateIncomeStatement(plannedIncomes, otherIncomeTransactions, []);

            expect(result.revenue.total).toBe(6200); // 5000 + 1000 + 200
            expect(result.revenue.items).toHaveLength(3); // Salary, Bonus, Interest
        });

        it('should calculate expenses from project snapshots', () => {
            const projectWithSnapshots = projects.map(p => ({
                project: p,
                snapshot: createProjectSnapshot({ expense: 300, income: 0 }),
            }));

            const result = calculateIncomeStatement([], [], projectWithSnapshots);

            expect(result.expenses.total).toBe(300);
            expect(result.expenses.items[0].category).toBe('Living');
        });

        it('should calculate net income', () => {
            const plannedIncomes = [createPlannedIncome({ amount: 1000, category: 'salary' })];
            const projectWithSnapshots = projects.map(p => ({
                project: p,
                snapshot: createProjectSnapshot({ expense: 300, income: 0 }),
            }));

            const result = calculateIncomeStatement(plannedIncomes, [], projectWithSnapshots);

            expect(result.netIncome).toBe(700);
        });
    });

    describe('calculateBalanceSheet', () => {
        it('should calculate assets from accounts and project snapshots', () => {
            const accountSnapshots = [
                createAccountSnapshot({ amount: 1000 }),
                createAccountSnapshot({ amount: 500 }),
            ];

            const projectWithSnapshots = [{
                project: projects[2],
                snapshot: createProjectSnapshot({ closingBalance: 2000 }),
            }];

            const result = calculateBalanceSheet(accountSnapshots, projectWithSnapshots);

            expect(result.assets.total).toBe(3500); // 1500 (Cash) + 2000 (Investment)
            const cashItem = result.assets.items.find(i => i.category === 'Cash & Equivalents');
            expect(cashItem?.amount).toBe(1500);
        });

        it('should calculate liabilities from project snapshots', () => {
            const projectWithSnapshots = [{
                project: projects[3],
                snapshot: createProjectSnapshot({ closingBalance: 5000 }), // Loan Project (Liability)
            }
            ];

            const result = calculateBalanceSheet([], projectWithSnapshots);

            expect(result.liabilities.total).toBe(5000);
        });
    });

    describe('calculateCashFlowStatement', () => {
        it('should calculate cash flow sections based on project net change', () => {
            const snapshots = [
                createProjectSnapshot({ income: 5000, expense: 0 }), // Salary (Operating Inflow)
                createProjectSnapshot({ income: 0, expense: 300 }), // Food (Operating Outflow)
                createProjectSnapshot({ income: 0, expense: 1000 }), // Stock Buy (Investing Outflow)
                createProjectSnapshot({ income: 2000, expense: 0 }), // Loan Received (Financing Inflow)
            ];

            const projectWithSnapshots = projects.map((p, i) => ({
                project: p,
                snapshot: snapshots[i],
            }));

            const beginningCash = 1000;
            const result = calculateCashFlowStatement(projectWithSnapshots, beginningCash);

            expect(result.operating.netAmount).toBe(4700); // 5000 - 300
            expect(result.investing.netAmount).toBe(-1000); // -1000
            expect(result.financing.netAmount).toBe(2000); // 2000

            expect(result.netChange).toBe(5700);
            expect(result.endingBalance).toBe(6700); // 1000 + 5700
        });
    });

    describe('reconcileReports', () => {
        it('should return true if balance sheet cash matches cash flow ending balance', () => {
            const balanceSheet = createBalanceSheetData({
                assets: {
                    total: 1000,
                    items: [createBalanceSheetItem({ category: 'Cash & Equivalents', amount: 1000 })],
                },
            });

            const cashFlow = createCashFlowData({
                endingBalance: 1000,
            });

            const result = reconcileReports(balanceSheet, cashFlow);
            expect(result.reconciled).toBe(true);
            expect(result.difference).toBe(0);
        });

        it('should return false if there is a discrepancy', () => {
            const balanceSheet = createBalanceSheetData({
                assets: {
                    total: 1000,
                    items: [createBalanceSheetItem({ category: 'Cash & Equivalents', amount: 1000 })],
                },
            });

            const cashFlow = createCashFlowData({
                endingBalance: 900,
            });

            const result = reconcileReports(balanceSheet, cashFlow);
            expect(result.reconciled).toBe(false);
            expect(result.difference).toBe(100);
        });
    });
});
