import { describe, expect, it } from 'vitest';

import {
  AccountSnapshotFormSchema,
  mapAccountSnapshotVMToDomain,
} from '@/ui/features/account/viewmodels/accountSnapshot.vm';

describe('accountSnapshot.vm', () => {
  it('parses valid snapshot form vm', () => {
    const vm = AccountSnapshotFormSchema.parse({
      year: 2026,
      month: 3,
      amount: 1000,
      originalAmount: 1000,
      exchangeRate: 1,
      holdings: [],
    });

    expect(vm.month).toBe(3);
  });

  it('rejects non-positive exchange rate with localized message', () => {
    expect(() =>
      AccountSnapshotFormSchema.parse({
        year: 2026,
        month: 3,
        amount: 1000,
        originalAmount: 1000,
        exchangeRate: 0,
        holdings: [],
      }),
    ).toThrow('匯率需大於 0');
  });

  it('maps vm to domain payload', () => {
    const vm = AccountSnapshotFormSchema.parse({
      year: 2026,
      month: 3,
      amount: 2000,
      originalAmount: 60,
      exchangeRate: 33.3,
      holdings: [],
    });

    const domain = mapAccountSnapshotVMToDomain('account-1', vm);
    expect(domain.accountId).toBe('account-1');
    expect(domain.amount).toBe(2000);
    expect(domain.exchangeRate).toBe(33.3);
  });
});
