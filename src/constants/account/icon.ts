import { AccountCategory } from '@/domains/account/types/categories';

export const AccountCategoryIcons = {
  [AccountCategory.BANK]: '🏦',
  [AccountCategory.CASH]: '💵',
  [AccountCategory.INVESTMENT]: '📈',
  [AccountCategory.OTHER]: '📦',
} as const;
