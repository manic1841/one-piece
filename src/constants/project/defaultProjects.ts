import { BalanceSheetCategory, EquitySubCategory } from '@/domains/finance/types/categories';
import { ProjectCategory } from '@/domains/project/types/categories';
import type { ProjectCreate } from '@/schemas/project';

export const DEFAULT_PROJECTS: ProjectCreate[] = [
  {
    name: 'Retained Earnings',
    description: 'Accumulated net income minus dividends paid.',
    category: ProjectCategory.EQUITY,
    color: '#4f46e5', // Indigo
    icon: '💰',
    order: 0,
    isActive: true,
    accounting: {
      enabled: true,
      balanceSheet: {
        category: BalanceSheetCategory.EQUITY,
        subcategory: EquitySubCategory.RETAINED_EARNINGS,
      },
    },
  },
];
