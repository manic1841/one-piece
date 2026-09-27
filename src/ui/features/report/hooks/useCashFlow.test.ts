import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type StoredReportData } from '@/application/report/use_cases/getStoredReportUseCase';
import { getStoredReportUseCase } from '@/application/report/use_cases/getStoredReportUseCase';
import { type CashFlowData } from '@/domains/report/schemas';
import { type AuthState } from '@/ui/contexts/AuthStateContext';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useCashFlow } from './useCashFlow';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
}));

vi.mock('@/application/report/use_cases/getStoredReportUseCase', () => ({
  getStoredReportUseCase: { execute: vi.fn() },
}));

const executeMock = vi.mocked(getStoredReportUseCase.execute);

const authState = (overrides: Partial<AuthState> = {}): AuthState => ({
  user: { uid: 'user-1', email: 'user@example.com' },
  userProfile: null,
  isAdmin: false,
  loading: false,
  initError: null,
  logout: vi.fn(),
  loginWithGoogle: vi.fn(),
  refreshProfile: vi.fn(),
  ...overrides,
});

const cashFlow = (yearMonth: string, netCashChange: number): CashFlowData => ({
  yearMonth,
  operating: {
    label: '營業活動',
    total: netCashChange,
    inflowItems: [{ code: 'income:salary', label: '薪資', amount: netCashChange }],
    outflowItems: [],
  },
  investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
  financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
  netCashChange,
  beginningBalance: 1000,
  endingBalance: 1000 + netCashChange,
  actualBalance: 1000 + netCashChange,
  adjustment: 0,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const renderCashFlow = (date: Date) =>
  renderHook(({ date: current }: { date: Date }) => useCashFlow('household-1', current), {
    initialProps: { date },
  });

describe('useCashFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthState).mockReturnValue(authState());
  });

  it('loads the stored cash flow report and maps it to a view model', async () => {
    executeMock.mockResolvedValue(cashFlow('2026-03', 100));

    const { result } = renderCashFlow(new Date('2026-03-15'));

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(executeMock).toHaveBeenCalledWith({
      householdId: 'household-1',
      yearMonth: '2026-03',
      kind: 'cashFlow',
      auth: { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false },
    });
    expect(result.current.data?.yearMonth).toBe('2026-03');
    expect(result.current.data?.netCashChangeText).toContain('100');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keys the stored report by year when the report mode is yearly', async () => {
    executeMock.mockResolvedValue(cashFlow('2026', 0));

    renderHook(() => useCashFlow('household-1', new Date('2026-05-20'), 'YEARLY'));

    await waitFor(() =>
      expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({ yearMonth: '2026' })),
    );
  });

  it('drops a superseded run so the older month cannot land last', async () => {
    const march = deferred<StoredReportData | null>();
    const april = deferred<StoredReportData | null>();
    executeMock.mockReturnValueOnce(march.promise).mockReturnValueOnce(april.promise);

    const { result, rerender } = renderCashFlow(new Date('2026-03-15'));

    expect(executeMock).toHaveBeenCalledTimes(1);

    rerender({ date: new Date('2026-04-15') });
    await waitFor(() => expect(executeMock).toHaveBeenCalledTimes(2));

    // The newer month lands first.
    await act(async () => {
      april.resolve(cashFlow('2026-04', 400));
    });
    await waitFor(() => expect(result.current.data?.yearMonth).toBe('2026-04'));

    // The abandoned March run settles afterwards and must not overwrite April.
    await act(async () => {
      march.resolve(cashFlow('2026-03', 300));
    });
    expect(result.current.data?.yearMonth).toBe('2026-04');
    expect(result.current.data?.netCashChangeText).toContain('400');
  });

  it('clears the data when a later run fails', async () => {
    executeMock.mockResolvedValueOnce(cashFlow('2026-03', 100));

    const { result } = renderCashFlow(new Date('2026-03-15'));
    await waitFor(() => expect(result.current.data).not.toBeNull());

    executeMock.mockRejectedValueOnce(new Error('report backend down'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.errorMessage).toBe('report backend down');
    expect(result.current.loading).toBe(false);
  });

  it('clears the data when no stored report exists for the month', async () => {
    executeMock.mockResolvedValueOnce(cashFlow('2026-03', 100));

    const { result } = renderCashFlow(new Date('2026-03-15'));
    await waitFor(() => expect(result.current.data).not.toBeNull());

    executeMock.mockResolvedValueOnce(null);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
