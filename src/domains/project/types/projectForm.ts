import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '@/domains/finance/finaceCategory';
import { ProjectCategory } from '@/domains/project/types';

export interface ProjectFormData {
  name: string;
  category: ProjectCategory;
  icon: string;
  color: string;
  description: string;
  accounting: {
    enabled: boolean;
    incomeStatement?: {
      category: IncomeStatementCategory;
      order?: number;
    };
    cashFlow?: {
      category: CashFlowCategory;
      order?: number;
    };
    balanceSheet?: {
      category: BalanceSheetCategory;
      order?: number;
    };
  };
}
