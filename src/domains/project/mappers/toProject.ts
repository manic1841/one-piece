import { NO_SELECTED } from '@/constants/empty';
import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '@/domains/finance/types/categories';
import { ProjectCategory, type ProjectFormData } from '@/domains/project/types';
import type { ProjectCreate } from '@/schemas';

function mapAccountingItem<T>(
  item: { category: string; subcategory?: string; order?: number } | null | undefined,
):
  | {
      category: T;
      subcategory: string | null;
      order?: number;
    }
  | undefined {
  // Skip if item is null/undefined or category is NO_SELECTED
  if (!item || !item.category || item.category === NO_SELECTED) {
    return undefined;
  }

  return {
    category: item.category as T,
    subcategory: item.subcategory && item.subcategory !== NO_SELECTED ? item.subcategory : null,
    order: item.order ?? 0,
  };
}

export const toProject = (formData: ProjectFormData): ProjectCreate => {
  const incomeStatement = mapAccountingItem<IncomeStatementCategory>(
    formData.accounting.incomeStatement,
  );
  const cashFlow = mapAccountingItem<CashFlowCategory>(formData.accounting.cashFlow);
  const balanceSheet = mapAccountingItem<BalanceSheetCategory>(formData.accounting.balanceSheet);

  return {
    name: formData.name,
    category: formData.category as ProjectCategory,
    icon: formData.icon,
    color: formData.color,
    description: formData.description || undefined,
    accounting: {
      enabled: formData.accounting.enabled,
      flowBehavior: formData.accounting.flowBehavior
        ? {
            incomeAs: formData.accounting.flowBehavior.incomeAs,
            expenseAs: formData.accounting.flowBehavior.expenseAs,
          }
        : undefined,
      incomeStatement,
      cashFlow,
      balanceSheet,
    },
    isActive: true,
    order: 0,
  };
};
