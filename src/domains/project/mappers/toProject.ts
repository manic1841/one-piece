import type { ProjectCreate } from '@/schemas';

import type { ProjectFormData } from '../types';

export const toProject = (formData: ProjectFormData): ProjectCreate => {
  return {
    name: formData.name,
    category: formData.category,
    icon: formData.icon,
    color: formData.color,
    description: formData.description || undefined,
    accounting: {
      enabled: formData.accounting.enabled,
      incomeStatement: formData.accounting.incomeStatement,
      cashFlow: formData.accounting.cashFlow,
      balanceSheet: formData.accounting.balanceSheet,
    },
    isActive: true,
    isPersonal: false,
    order: 0,
  };
};
