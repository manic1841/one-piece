import type {
  AccountCategory,
  AccountCreate,
  AccountFormData,
  CurrencyType,
} from '@/domains/account/types';
import { nullOrData } from '@/ui/constants/empty';

export const toAccount = (data: AccountFormData): AccountCreate => {
  return {
    name: data.name,
    category: nullOrData(data.category) as AccountCategory,
    currency: data.currency as CurrencyType,
    order: data.order ?? 0,
  };
};
