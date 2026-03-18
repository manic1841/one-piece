import { z } from 'zod';

import { type AccountSnapshotCreate } from '@/domains/account/types/account';
import { HoldingSchema } from '@/domains/account/schemas';

export const AccountSnapshotFormSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number(),
  originalAmount: z.number(),
  exchangeRate: z.number().positive(),
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
