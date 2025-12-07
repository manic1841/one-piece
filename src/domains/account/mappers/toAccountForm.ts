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
    };
  }

  return {
    name: data.name,
    category: data.category || '',
    currency: data.currency || '',
  };
};
