import { Timestamp } from 'firebase/firestore';
import type {
    FinancialReport,
    IncomeStatementData,
    IncomeStatementItem,
    BalanceSheetData,
    BalanceSheetItem,
    CashFlowData,
    CashFlowItem,
} from '../schemas/report';

/**
 * Report Test Factory Functions
 * These factories create mock report data objects for testing purposes
 */

// Factory: IncomeStatementItem
export function createIncomeStatementItem(overrides?: Partial<IncomeStatementItem>): IncomeStatementItem {
    return {
        category: 'Test Category',
        amount: 0,
        subItems: [],
        ...overrides,
    };
}

// Factory: IncomeStatementData
export function createIncomeStatementData(overrides?: Partial<IncomeStatementData>): IncomeStatementData {
    return {
        revenue: {
            total: 0,
            items: [],
        },
        expenses: {
            total: 0,
            items: [],
        },
        netIncome: 0,
        ...overrides,
    };
}

// Factory: BalanceSheetItem
export function createBalanceSheetItem(overrides?: Partial<BalanceSheetItem>): BalanceSheetItem {
    return {
        category: 'Test Category',
        amount: 0,
        subItems: [],
        ...overrides,
    };
}

// Factory: BalanceSheetData
export function createBalanceSheetData(overrides?: Partial<BalanceSheetData>): BalanceSheetData {
    return {
        assets: {
            total: 0,
            items: [],
        },
        liabilities: {
            total: 0,
            items: [],
        },
        equity: {
            total: 0,
            items: [],
        },
        ...overrides,
    };
}

// Factory: CashFlowItem
export function createCashFlowItem(overrides?: Partial<CashFlowItem>): CashFlowItem {
    return {
        category: 'Test Category',
        amount: 0,
        ...overrides,
    };
}

// Factory: CashFlowData
export function createCashFlowData(overrides?: Partial<CashFlowData>): CashFlowData {
    return {
        operating: {
            netAmount: 0,
            items: [],
        },
        investing: {
            netAmount: 0,
            items: [],
        },
        financing: {
            netAmount: 0,
            items: [],
        },
        netChange: 0,
        beginningBalance: 0,
        endingBalance: 0,
        ...overrides,
    };
}

// Factory: FinancialReport (Income Statement)
export function createIncomeStatementReport(overrides?: Partial<FinancialReport>): FinancialReport {
    const now = Timestamp.now();
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    return {
        id: `income_statement_${year}-${month}`,
        type: 'income_statement',
        year,
        month,
        startDate: now,
        endDate: now,
        status: 'draft',
        reconciled: false,
        cached: false,
        data: createIncomeStatementData(),
        generatedAt: now,
        generatedBy: 'test-user',
        updatedAt: now,
        ...overrides,
    };
}

// Factory: FinancialReport (Balance Sheet)
export function createBalanceSheetReport(overrides?: Partial<FinancialReport>): FinancialReport {
    const now = Timestamp.now();
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    return {
        id: `balance_sheet_${year}-${month}`,
        type: 'balance_sheet',
        year,
        month,
        startDate: now,
        endDate: now,
        status: 'draft',
        reconciled: false,
        cached: false,
        data: createBalanceSheetData(),
        generatedAt: now,
        generatedBy: 'test-user',
        updatedAt: now,
        ...overrides,
    };
}

// Factory: FinancialReport (Cash Flow)
export function createCashFlowReport(overrides?: Partial<FinancialReport>): FinancialReport {
    const now = Timestamp.now();
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    return {
        id: `cash_flow_${year}-${month}`,
        type: 'cash_flow',
        year,
        month,
        startDate: now,
        endDate: now,
        status: 'draft',
        reconciled: false,
        cached: false,
        data: createCashFlowData(),
        generatedAt: now,
        generatedBy: 'test-user',
        updatedAt: now,
        ...overrides,
    };
}

// Batch Factory: Create multiple IncomeStatementItems
export function createIncomeStatementItems(count: number, overrides?: Partial<IncomeStatementItem>): IncomeStatementItem[] {
    return Array.from({ length: count }, (_, i) =>
        createIncomeStatementItem({
            category: `Category ${i + 1}`,
            ...overrides,
        })
    );
}

// Batch Factory: Create multiple BalanceSheetItems
export function createBalanceSheetItems(count: number, overrides?: Partial<BalanceSheetItem>): BalanceSheetItem[] {
    return Array.from({ length: count }, (_, i) =>
        createBalanceSheetItem({
            category: `Category ${i + 1}`,
            ...overrides,
        })
    );
}

// Batch Factory: Create multiple CashFlowItems
export function createCashFlowItems(count: number, overrides?: Partial<CashFlowItem>): CashFlowItem[] {
    return Array.from({ length: count }, (_, i) =>
        createCashFlowItem({
            category: `Category ${i + 1}`,
            ...overrides,
        })
    );
}
