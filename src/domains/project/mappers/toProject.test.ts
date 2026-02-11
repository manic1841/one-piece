import { describe, expect, it } from 'vitest';

import { NO_SELECTED } from '../../../constants/empty';
import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '../../finance/types/category';
import type { ProjectFormData } from '../types/projectForm';

import { toProject } from './toProject';

describe('toProject', () => {
  const baseFormData: ProjectFormData = {
    name: 'Test Project',
    category: 'operating',
    icon: '💰',
    color: '#3b82f6',
    description: 'Test description',
    accounting: {
      enabled: false,
    },
  };

  it('should map basic project fields correctly', () => {
    const result = toProject(baseFormData);

    expect(result.name).toBe('Test Project');
    expect(result.category).toBe('operating');
    expect(result.icon).toBe('💰');
    expect(result.color).toBe('#3b82f6');
    expect(result.description).toBe('Test description');
    expect(result.isActive).toBe(true);
    expect(result.order).toBe(0);
  });

  it('should handle accounting disabled', () => {
    const result = toProject(baseFormData);

    expect(result.accounting.enabled).toBe(false);
    expect(result.accounting.incomeStatement).toBeUndefined();
    expect(result.accounting.cashFlow).toBeUndefined();
    expect(result.accounting.balanceSheet).toBeUndefined();
  });

  it('should map income statement with category and subcategory', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.INCOME,
          subcategory: 'salary',
          order: 1,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.enabled).toBe(true);
    expect(result.accounting.incomeStatement).toEqual({
      category: IncomeStatementCategory.INCOME,
      subcategory: 'salary',
      order: 1,
    });
  });

  it('should map cash flow with category and subcategory', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        cashFlow: {
          category: CashFlowCategory.OPERATING,
          subcategory: 'regular_operations',
          order: 2,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.cashFlow).toEqual({
      category: CashFlowCategory.OPERATING,
      subcategory: 'regular_operations',
      order: 2,
    });
  });

  it('should map balance sheet with category and subcategory', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        balanceSheet: {
          category: BalanceSheetCategory.ASSET,
          subcategory: 'cash',
          order: 3,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.balanceSheet).toEqual({
      category: BalanceSheetCategory.ASSET,
      subcategory: 'cash',
      order: 3,
    });
  });

  it('should handle accounting items without subcategory', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.EXPENSE,
          order: 1,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.incomeStatement).toEqual({
      category: IncomeStatementCategory.EXPENSE,
      subcategory: null,
      order: 1,
    });
  });

  it('should ignore accounting items with NO_SELECTED category', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: NO_SELECTED,
          subcategory: 'salary',
          order: 1,
        },
        cashFlow: {
          category: NO_SELECTED,
          order: 2,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.incomeStatement).toBeUndefined();
    expect(result.accounting.cashFlow).toBeUndefined();
  });

  it('should handle all three accounting items together', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.INCOME,
          subcategory: 'bonus',
          order: 1,
        },
        cashFlow: {
          category: CashFlowCategory.FINANCING,
          subcategory: 'long_term_loans',
          order: 2,
        },
        balanceSheet: {
          category: BalanceSheetCategory.LIABILITY,
          subcategory: 'long_term_debt',
          order: 3,
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.incomeStatement).toEqual({
      category: IncomeStatementCategory.INCOME,
      subcategory: 'bonus',
      order: 1,
    });
    expect(result.accounting.cashFlow).toEqual({
      category: CashFlowCategory.FINANCING,
      subcategory: 'long_term_loans',
      order: 2,
    });
    expect(result.accounting.balanceSheet).toEqual({
      category: BalanceSheetCategory.LIABILITY,
      subcategory: 'long_term_debt',
      order: 3,
    });
  });

  it('should default order to 0 when not provided', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
        incomeStatement: {
          category: IncomeStatementCategory.INCOME,
          subcategory: 'salary',
        },
      },
    };

    const result = toProject(formData);

    expect(result.accounting.incomeStatement?.order).toBe(0);
  });

  it('should handle empty description', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      description: '',
    };

    const result = toProject(formData);

    expect(result.description).toBeUndefined();
  });

  it('should handle undefined accounting items', () => {
    const formData: ProjectFormData = {
      ...baseFormData,
      accounting: {
        enabled: true,
      },
    };

    const result = toProject(formData);

    expect(result.accounting.incomeStatement).toBeUndefined();
    expect(result.accounting.cashFlow).toBeUndefined();
    expect(result.accounting.balanceSheet).toBeUndefined();
  });
});
