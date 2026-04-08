import { AccountCategory } from '@/domains/account/types/categories';

export const AccountCategoryIcons = {
  [AccountCategory.BANK]: '??',
  [AccountCategory.CASH]: '??',
  [AccountCategory.SECURITIES]: '??',
  [AccountCategory.OTHER]: '??',
} as const;
