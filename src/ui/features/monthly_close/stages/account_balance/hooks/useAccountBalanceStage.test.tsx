import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { getPreviousSnapshotUseCase } from '@/application/account/use_cases/getPreviousSnapshotUseCase';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';

import { useAccountBalanceStage } from './useAccountBalanceStage';

vi.mock('@/application/account/use_cases/getAccountSnapshotsUseCase', () => ({
  getAccountSnapshotsUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/account/use_cases/getPreviousSnapshotUseCase', () => ({
  getPreviousSnapshotUseCase: { execute: vi.fn() },
}));

const auth = { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false };

const account = (id: string): Account =>
  ({
    id,
    name: `帳戶 ${id}`,
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as unknown as Account;

const snapshot = (accountId: string, amount: number): AccountSnapshot =>
  ({ id: `${accountId}-2026-08`, accountId, year: 2026, month: 8, amount }) as AccountSnapshot;

const accounts = [account('acc-1')];

/** The snapshot loader answers one booked balance per month, keyed by month. */
const mockBookedBalances = (byMonth: Record<number, number>) => {
  vi.mocked(getAccountSnapshotsUseCase.execute).mockImplementation(async (request) =>
    byMonth[request.month] === undefined
      ? []
      : [snapshot(request.accountId, byMonth[request.month])],
  );
};

const renderStage = (selectedYearMonth = '2026-08') =>
  renderHook(
    ({ yearMonth }: { yearMonth: string }) =>
      useAccountBalanceStage({
        householdId: 'household-1',
        selectedYearMonth: yearMonth,
        accounts,
        auth,
        confirmingStageId: null,
      }),
    { initialProps: { yearMonth: selectedYearMonth } },
  );

describe('useAccountBalanceStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreviousSnapshotUseCase.execute).mockResolvedValue(null);
  });

  it('prefills the draft from the month booked snapshots', async () => {
    mockBookedBalances({ 8: 12_000 });

    const { result } = renderStage();

    await waitFor(() => expect(result.current.balances).toHaveLength(1));
    expect(result.current.balances[0]).toMatchObject({ accountId: 'acc-1', amount: 12_000 });
  });

  it('exposes the previous month snapshot per account', async () => {
    mockBookedBalances({ 8: 12_000 });
    vi.mocked(getPreviousSnapshotUseCase.execute).mockResolvedValue(snapshot('acc-1', 9_000));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.accountSnapshots.size).toBe(1));
    expect(result.current.accountSnapshots.get('acc-1')?.amount).toBe(9_000);
  });

  // #232: prefill is a one-shot seed per month. It used to re-seed whenever the
  // draft was empty, so a user who cleared every row got their deletions undone
  // by the next refresh.
  it('does not re-prefill a month after the user cleared every row (#232)', async () => {
    mockBookedBalances({ 8: 12_000 });

    const { result } = renderStage();
    await waitFor(() => expect(result.current.balances).toHaveLength(1));

    act(() => {
      result.current.setBalances([]);
    });
    await act(async () => {
      await result.current.refresh?.();
    });

    expect(result.current.balances).toEqual([]);
  });

  it('prefills the new month after switching (#232)', async () => {
    mockBookedBalances({ 8: 12_000, 9: 15_000 });

    const { result, rerender } = renderStage();
    await waitFor(() => expect(result.current.balances).toHaveLength(1));

    rerender({ yearMonth: '2026-09' });

    await waitFor(() =>
      expect(result.current.balances[0]).toMatchObject({ accountId: 'acc-1', amount: 15_000 }),
    );
  });

  it('surfaces the canned copy when the snapshot load fails', async () => {
    vi.mocked(getAccountSnapshotsUseCase.execute).mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.errorMessage).toBe('無法載入帳戶快照，請稍後再試。'));
    expect(result.current.balances).toEqual([]);
  });
});
