import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { DRIFT_STATUS } from '@/domains/report/reportDrift';

import { useFinancialReportsStage } from './useFinancialReportsStage';

const { authIdentity } = vi.hoisted(() => ({
  authIdentity: { uid: 'user-1', email: 'user@test.com', isGlobalAdmin: false },
}));

vi.mock('@/ui/hooks/useAuthIdentity', () => ({
  useAuthIdentity: () => authIdentity,
}));
vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/application/report/use_cases/getReportPersistenceStateUseCase', () => ({
  getReportPersistenceStateUseCase: {
    execute: vi.fn().mockResolvedValue({ isPersisted: false, timestamps: {} }),
  },
}));
vi.mock('@/application/report/use_cases/previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));

const buildPreview = (incomeTotal: number, isPersisted = false) =>
  ({
    incomeStatement: {
      yearMonth: '2026-03',
      incomeTotal,
      expenseTotal: 30000,
      netIncome: incomeTotal - 30000,
      incomeItems: [{ code: 'income:salary', label: '薪資', amount: incomeTotal }],
      expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
    },
    balanceSheet: {
      yearMonth: '2026-03',
      assets: { total: 100000, groups: {} },
      liabilities: { total: 0, groups: {} },
      equity: { total: 100000, groups: {} },
    },
    cashFlow: {
      yearMonth: '2026-03',
      operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
      investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
      financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
      netCashChange: 0,
      beginningBalance: 0,
      endingBalance: 0,
      actualBalance: 0,
      adjustment: 0,
    },
    isPersisted,
    timestamps: {},
  }) as never;

const persistedBundle = (incomeTotal: number) =>
  ({
    incomeStatement: {
      incomeTotal,
      expenseTotal: 30000,
      netIncome: incomeTotal - 30000,
      incomeItems: [{ code: 'income:salary', label: '薪資', amount: incomeTotal }],
      expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
    },
    balanceSheet: null,
    cashFlow: null,
  }) as never;

interface StageProps {
  yearMonth: string;
  persisted: ReturnType<typeof persistedBundle> | null;
  isClosed: boolean;
}

const renderStage = (initial: Partial<StageProps> = {}) =>
  renderHook(
    ({ yearMonth, persisted, isClosed }: StageProps) =>
      useFinancialReportsStage({
        householdId: 'household-1',
        selectedYearMonth: yearMonth,
        confirmingStageId: null,
        persistedBundle: persisted,
        isClosed,
      }),
    {
      initialProps: {
        yearMonth: '2026-03',
        persisted: null,
        isClosed: false,
        ...initial,
      } as StageProps,
    },
  );

const mockPreview = vi.mocked(previewFinancialReportsWorkflow.execute);
const mockPersistence = vi.mocked(getReportPersistenceStateUseCase.execute);

describe('useFinancialReportsStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistence.mockResolvedValue({ isPersisted: false, timestamps: {} });
  });

  it('annotates a live preview figure against the persisted bundle CLOSE_PERIOD owns', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));

    const { result } = renderStage({ persisted: persistedBundle(40000) });

    await waitFor(() =>
      expect(result.current.reports.incomeStatement?.incomeTotal).toMatchObject({
        amount: 50000,
        previousAmount: 40000,
        status: DRIFT_STATUS.CHANGED,
      }),
    );
  });

  it('renders the persisted record without drift marks when the period is closed', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));

    const { result } = renderStage({ persisted: persistedBundle(40000), isClosed: true });

    await waitFor(() =>
      expect(result.current.reports.incomeStatement?.incomeTotal).toEqual({
        amount: 40000,
        previousAmount: null,
        status: DRIFT_STATUS.UNCHANGED,
      }),
    );
  });

  it('exposes the persistence flag the CLOSE_PERIOD evidence reads', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockPersistence.mockResolvedValue({ isPersisted: true, timestamps: {} });

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));
  });

  it('clears the loaded reports on a month switch before the new month loads', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));

    const { result, rerender } = renderStage();
    await waitFor(() => expect(result.current.reports.incomeStatement).not.toBeNull());

    act(() => rerender({ yearMonth: '2026-04', persisted: null, isClosed: false }));

    expect(result.current.reports.incomeStatement).toBeNull();
  });

  it('surfaces the canned message and settles loading when the preview load fails', async () => {
    mockPreview.mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.error).toBe('無法載入報表預覽，請稍後再試。'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.reports.incomeStatement).toBeNull();
  });

  it('keeps the previous preview on a same-month refresh failure but flags the error (#226)', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockPersistence.mockResolvedValue({ isPersisted: true, timestamps: {} });

    const { result } = renderStage();
    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));

    mockPreview.mockRejectedValue(new Error('boom'));
    await act(() => result.current.refresh?.());

    await waitFor(() => expect(result.current.error).not.toBeNull());
    // The stale flag and preview stay on screen by design; consumers gate on the
    // error, so a stale `reportsPersisted: true` is never read as verified.
    expect(result.current.reportsPersisted).toBe(true);
    expect(result.current.reports.incomeStatement).not.toBeNull();
  });
});
