import { z } from 'zod';

import { type AccountCreate, type Holding } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { formatCurrency } from '@/ui/utils';

export { AccountCategory, CurrencyType };
export type {
  Account,
  AccountCreate,
  AccountSnapshot,
  AccountWithSnapshot,
  Holding,
} from '@/domains/account/types/account';
export type { CurrencyCode } from '@/domains/exchange_rate/types';

export const AccountFormSchema = z.object({
  name: z.string().min(1, '帳戶名稱不能為空'),
  category: z.enum(AccountCategory),
  currency: z.enum(CurrencyType),
});

export type AccountFormVM = z.output<typeof AccountFormSchema>;

/** Create-only form: `order` belongs to drag, so it is never part of the input. */
export const createDefaultAccountFormVM = (): AccountFormVM => ({
  name: '',
  category: AccountCategory.BANK,
  currency: CurrencyType.TWD,
});

export const mapAccountVMToDomain = (vm: AccountFormVM): AccountCreate => {
  return {
    name: vm.name,
    category: vm.category,
    currency: vm.currency,
  };
};

export interface HoldingRowVM {
  id: string;
  symbol: string;
  name: string;
  costText: string;
  valueText: string;
  leverageText: string;
}

export const toHoldingRowVM = (holding: Holding, index: number): HoldingRowVM => ({
  id: `${holding.symbol}-${index}`,
  symbol: holding.symbol,
  name: holding.name,
  costText: formatCurrency(holding.cost),
  valueText: formatCurrency(holding.marketValue),
  leverageText: `${(holding.leverage ?? 1).toFixed(2)}x`,
});
