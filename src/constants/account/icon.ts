import { AccountCategory } from '@/domains/account/types/category';

export const AccountCategoryIcons = {
  [AccountCategory.BANK]: '🏦',
  [AccountCategory.CASH]: '💵',
  [AccountCategory.INVESTMENT]: '📈',
  [AccountCategory.OTHER]: '📦',
} as const;
