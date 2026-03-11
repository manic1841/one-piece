import {
  ProjectCategory,
  ProjectExpenseBehavior,
  type ProjectFormData,
  ProjectIncomeBehavior,
} from '@/domains/project/types';
import type { Project } from '@/schemas';

function mapAccountingItem(
  item: { category: string; subcategory?: string | null; order?: number } | null | undefined,
) {
  return {
    category: item?.category ?? '',
    subcategory: item?.subcategory ?? '',
    order: item?.order,
  };
}

export const toForm = (project?: Project): ProjectFormData => {
  if (!project) {
    return {
      name: '',
      category: ProjectCategory.OPERATING,
      icon: '',
      color: '',
      description: '',
      isActive: true,
      order: 0,
      accounting: {
        enabled: false,
      },
    };
  }

  let accounting: ProjectFormData['accounting'] = { enabled: false };
  if (project.accounting?.enabled) {
    accounting = {
      enabled: true,
      flowBehavior: {
        incomeAs:
          (project.accounting.flowBehavior?.incomeAs as ProjectIncomeBehavior) ??
          ProjectIncomeBehavior.INCREASE_INCOME,
        expenseAs:
          (project.accounting.flowBehavior?.expenseAs as ProjectExpenseBehavior) ??
          ProjectExpenseBehavior.INCREASE_EXPENSE,
      },
      incomeStatement: mapAccountingItem(project.accounting.incomeStatement),
      cashFlow: mapAccountingItem(project.accounting.cashFlow),
      balanceSheet: mapAccountingItem(project.accounting.balanceSheet),
    };
  }
  return {
    name: project.name,
    category: project.category,
    icon: project.icon,
    color: project.color,
    description: project.description ?? '',
    isActive: project.isActive ?? true,
    order: project.order,
    accounting: accounting,
  };
};
