import { z } from 'zod';

import { type AccountCreate } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';

export const AccountFormSchema = z.object({
  name: z.string().min(1, '帳戶名稱不能為空'),
  category: z.enum(AccountCategory),
  currency: z.enum(CurrencyType),
  order: z.number().int(),
});

export type AccountFormVM = z.infer<typeof AccountFormSchema>;

export const mapAccountVMToDomain = (vm: AccountFormVM): AccountCreate => {
  return {
    name: vm.name,
    category: vm.category,
    currency: vm.currency,
    order: vm.order,
  };
};
