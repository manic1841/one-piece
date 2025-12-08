import { nullOrData } from '@/constants/empty';
import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '@/domains/finance/types/category';
import type { ProjectCategory, ProjectFormData } from '@/domains/project/types';
import type { ProjectCreate } from '@/schemas';

function mapAccountingItem<T>(item: { category: string; order?: number } | null | undefined):
  | {
      category: T;
      order?: number;
    }
  | undefined {
  if (item && !nullOrData(item.category)) {
    return {
      category: item.category as T,
      order: item.order,
    };
  }
  return undefined;
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
      incomeStatement,
      cashFlow,
      balanceSheet,
    },
    isActive: true,
    isPersonal: false,
    order: 0,
  };
};
