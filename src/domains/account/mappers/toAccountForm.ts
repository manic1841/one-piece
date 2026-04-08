import {
  type Account,
  AccountCategory,
  type AccountFormData,
  CurrencyType,
} from '@/domains/account/types/';

export const toAccountForm = (data?: Account): AccountFormData => {
  if (!data) {
    return {
      name: '',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      order: 0,
    };
  }

  return {
    name: data.name,
    category: data.category || '',
    currency: data.currency || '',
    order: data.order ?? 0,
  };
};
