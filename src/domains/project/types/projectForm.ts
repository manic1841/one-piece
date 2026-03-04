import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';

export interface ProjectFormData {
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  accounting: {
    enabled: boolean;
    flowBehavior?: {
      incomeAs: ProjectIncomeBehavior;
      expenseAs: ProjectExpenseBehavior;
    };
    incomeStatement?: {
      category: string;
      subcategory?: string;
      order?: number;
    };
    cashFlow?: {
      category: string;
      subcategory?: string;
      order?: number;
    };
    balanceSheet?: {
      category: string;
      subcategory?: string;
      order?: number;
    };
  };
}
