import { nullOrData } from '@/constants/empty';
import type {
  AccountCategory,
  AccountCreate,
  AccountFormData,
  CurrencyType,
} from '@/domains/account/types';

export const toAccount = (data: AccountFormData): AccountCreate => {
  return {
    name: data.name,
    category: nullOrData(data.category) as AccountCategory,
    currency: data.currency as CurrencyType,
  };
};
