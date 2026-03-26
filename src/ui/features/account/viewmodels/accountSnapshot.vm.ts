import { z } from 'zod';

import { HoldingSchema } from '@/domains/account/schemas';
import { type AccountSnapshotCreate } from '@/domains/account/types/account';

export const AccountSnapshotFormSchema = z.object({
  year: z.number().int().min(2000, '年份需介於 2000 到 2100').max(2100, '年份需介於 2000 到 2100'),
  month: z.number().int().min(1, '月份需介於 1 到 12').max(12, '月份需介於 1 到 12'),
  amount: z.number().min(0, '帳戶餘額不得小於 0'),
  originalAmount: z.number().min(0, '原幣金額不得小於 0'),
  exchangeRate: z.number().positive('匯率需大於 0'),
  holdings: z.array(HoldingSchema).optional(),
});

export type AccountSnapshotFormVM = z.infer<typeof AccountSnapshotFormSchema>;

export const mapAccountSnapshotVMToDomain = (
  accountId: string,
  vm: AccountSnapshotFormVM,
): AccountSnapshotCreate => {
  return {
    accountId,
    year: vm.year,
    month: vm.month,
    amount: vm.amount,
    originalAmount: vm.originalAmount,
    exchangeRate: vm.exchangeRate,
    holdings: vm.holdings,
  };
};
