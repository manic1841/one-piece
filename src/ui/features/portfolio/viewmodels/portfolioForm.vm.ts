import { z } from 'zod';

import { type Portfolio, type PortfolioCreate } from '@/domains/portfolio/types/portfolio';

export { AccountCategory } from '@/domains/account/types/categories';
export type { Account } from '@/domains/account/types/account';
export type { Portfolio } from '@/domains/portfolio/types/portfolio';

/**
 * Form VM for the portfolio dialog (ADR-0064).
 *
 * The three editable fields are strings at the boundary (`name`, plus the two
 * account ids a `SelectField` emits), and `isActive` is a checkbox boolean.
 * `order` is not user-editable: it rides through the form values so an edit
 * cannot reset the portfolio's sort position, and the submit gate validates it.
 */
export const PortfolioFormSchema = z.object({
  name: z.string().trim().min(1, '投資組合名稱不能為空'),
  securitiesAccountId: z.string().min(1, '請選擇證券帳戶'),
  bankAccountId: z.string().min(1, '請選擇銀行帳戶'),
  isActive: z.boolean(),
  order: z.number().int().min(0, '排序不能小於 0'),
});

export type PortfolioFormInput = z.input<typeof PortfolioFormSchema>;
export type PortfolioFormVM = z.output<typeof PortfolioFormSchema>;

export const createDefaultPortfolioFormVM = (): PortfolioFormInput => {
  return {
    name: '',
    securitiesAccountId: '',
    bankAccountId: '',
    isActive: true,
    order: 0,
  };
};

export const mapPortfolioToFormVM = (portfolio?: Portfolio): PortfolioFormInput => {
  if (!portfolio) return createDefaultPortfolioFormVM();
  return {
    name: portfolio.name,
    securitiesAccountId: portfolio.securitiesAccountId,
    bankAccountId: portfolio.bankAccountId,
    isActive: portfolio.isActive,
    order: portfolio.order || 0,
  };
};

export const mapPortfolioVMToDomain = (vm: PortfolioFormVM): PortfolioCreate => {
  return {
    name: vm.name,
    securitiesAccountId: vm.securitiesAccountId,
    bankAccountId: vm.bankAccountId,
    isActive: vm.isActive,
    order: vm.order,
  };
};
