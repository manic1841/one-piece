import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';

import { useCompletenessCheckStage } from './useCompletenessCheckStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/report/use_cases/getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));
vi.mock('@/application/monthly_close/use_cases/validateMonthTransactionsUseCase', () => ({
  validateMonthTransactionsUseCase: { execute: vi.fn() },
}));

const mockReadiness = vi.mocked(getSettlementReadinessUseCase.execute);
const mockValidation = vi.mocked(validateMonthTransactionsUseCase.execute);

const readinessFixture = {
  year: 2026,
  month: 8,
  isReady: true,
  totalAccounts: 2,
  totalPortfolios: 0,
  totalDebts: 0,
  totalProjects: 0,
  unsettledAccounts: [],
  unsettledPortfolios: [],
  unsettledDebts: [],
  unsettledProjects: [],
  totalUnsettled: 0,
};

const renderStage = (yearMonth = '2026-08') =>
  renderHook(
    ({ ym }: { ym: string }) =>
      useCompletenessCheckStage({
        householdId: 'household-1',
        selectedYearMonth: ym,
        confirmingStageId: null,
      }),
    { initialProps: { ym: yearMonth } },
  );

describe('useCompletenessCheckStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadiness.mockResolvedValue(readinessFixture);
    mockValidation.mockResolvedValue({
      yearMonth: '2026-08',
      checkedCount: 128,
      issues: [],
    });
  });

  it('owns the settlement readiness and transaction validation for COMPLETENESS_CHECK', async () => {
    const { result } = renderStage();

    await waitFor(() => expect(result.current.readiness?.isReady).toBe(true));
    expect(result.current.transactionIssues).toEqual([]);
  });

  // The same-month failure retention is covered in useStageLoader.test.ts.
  it('surfaces the canned message instead of reporting a clean month on failure', async () => {
    mockReadiness.mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.errorMessage).toBe('無法載入結算就緒狀態，請稍後再試。'),
    );
    expect(result.current.readiness).toBeNull();
  });
});
