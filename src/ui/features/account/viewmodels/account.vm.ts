import { z } from 'zod';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { type AccountCreate } from '@/domains/account/types/account';

export const AccountFormSchema = z.object({
  name: z.string().min(1, '帳戶名稱不能為空'),
  category: z.nativeEnum(AccountCategory),
  currency: z.nativeEnum(CurrencyType),
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
