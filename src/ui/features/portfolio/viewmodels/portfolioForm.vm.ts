import { z } from 'zod';

import { type PortfolioCreate } from '@/domains/portfolio/types/portfolio';

export { AccountCategory } from '@/domains/account/types/categories';
export type { Account } from '@/domains/account/types/account';

/**
 * Form VM for the portfolio create dialog (ADR-0064).
 *
 * The three editable fields are strings at the boundary (`name`, plus the two
 * account ids a `SelectField` emits). Lifecycle (`isActive`) and sort position
 * (`order`) are not part of create: the mapper supplies the initial values and
 * the detail page manages them thereafter (see #262). The repository writes the
 * payload as-is (no parse), so the domain defaults never apply on this path.
 */
export const PortfolioFormSchema = z.object({
  name: z.string().trim().min(1, '投資組合名稱不能為空'),
  securitiesAccountId: z.string().min(1, '請選擇證券帳戶'),
  bankAccountId: z.string().min(1, '請選擇銀行帳戶'),
});

export type PortfolioFormInput = z.input<typeof PortfolioFormSchema>;
export type PortfolioFormVM = z.output<typeof PortfolioFormSchema>;

export const createDefaultPortfolioFormVM = (): PortfolioFormInput => {
  return {
    name: '',
    securitiesAccountId: '',
    bankAccountId: '',
  };
};

export const mapPortfolioVMToDomain = (vm: PortfolioFormVM): PortfolioCreate => {
  return {
    name: vm.name,
    securitiesAccountId: vm.securitiesAccountId,
    bankAccountId: vm.bankAccountId,
    isActive: true,
    order: 0,
  };
};
