import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
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
vi.mock('@/application/report/use_cases/getStoredReportsBundleUseCase', () => ({
  getStoredReportsBundleUseCase: {
    execute: vi
      .fn()
      .mockResolvedValue({ incomeStatement: null, balanceSheet: null, cashFlow: null }),
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
  isClosed: boolean;
}

const renderStage = (initial: Partial<StageProps> = {}) =>
  renderHook(
    ({ yearMonth, isClosed }: StageProps) =>
      useFinancialReportsStage({
        householdId: 'household-1',
        selectedYearMonth: yearMonth,
        confirmingStageId: null,
        isClosed,
      }),
    {
      initialProps: {
        yearMonth: '2026-03',
        isClosed: false,
        ...initial,
      } as StageProps,
    },
  );

const mockPreview = vi.mocked(previewFinancialReportsWorkflow.execute);
const mockPersistence = vi.mocked(getReportPersistenceStateUseCase.execute);
const mockStoredBundle = vi.mocked(getStoredReportsBundleUseCase.execute);

describe('useFinancialReportsStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPersistence.mockResolvedValue({ isPersisted: false, timestamps: {} });
    mockStoredBundle.mockResolvedValue({
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    });
  });

  it('loads the preview and the persisted baseline once, from one call each (#228)', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportBundle).not.toBeNull());
    expect(mockPreview).toHaveBeenCalledTimes(1);
    expect(mockStoredBundle).toHaveBeenCalledTimes(1);
    expect(result.current.reportBundle?.cashFlow.adjustment).toBe(0);
  });

  it('annotates a live preview figure against the persisted bundle it owns', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockStoredBundle.mockResolvedValue(persistedBundle(40000));

    const { result } = renderStage();

    await waitFor(() =>
      expect(result.current.reports.incomeStatement?.incomeTotal).toMatchObject({
        amount: 50000,
        previousAmount: 40000,
        status: DRIFT_STATUS.CHANGED,
      }),
    );
  });

  // The gate reads this boolean from the same comparison as the rendered trees.
  it('reports hasAnyDrift from the same comparison as the rendered trees', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockStoredBundle.mockResolvedValue(persistedBundle(40000));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.hasAnyDrift).toBe(true));
  });

  it('reports no drift when the preview matches the persisted baseline', async () => {
    mockPreview.mockResolvedValue(buildPreview(40000));
    mockStoredBundle.mockResolvedValue(persistedBundle(40000));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportBundle).not.toBeNull());
    expect(result.current.hasAnyDrift).toBe(false);
  });

  it('renders the persisted record without drift marks when the period is closed', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockStoredBundle.mockResolvedValue(persistedBundle(40000));

    const { result } = renderStage({ isClosed: true });

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

  // The same-month failure retention is covered in useStageLoader.test.ts.
  it('surfaces the canned message and settles loading when the preview load fails', async () => {
    mockPreview.mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.error).toBe('無法載入報表預覽，請稍後再試。'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.reports.incomeStatement).toBeNull();
  });

  it('keeps the preview when only the persisted baseline read fails', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockStoredBundle.mockRejectedValue(new Error('boom'));

    const { result } = renderStage();

    await waitFor(() => expect(result.current.reportBundle).not.toBeNull());
    expect(result.current.persistedBundle).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // T13 (#237): a reset (go-to-stage-with-reset, or a cascade-demote) deletes
  // the persisted reports while the period is still open. The refresh that
  // follows must drop the flag and the timestamps, or Step 7 would keep offering
  // the "already generated" state for files that no longer exist.
  it('drops the persisted flag and timestamps when the reports stop being persisted', async () => {
    mockPreview.mockResolvedValue(buildPreview(50000));
    mockPersistence.mockResolvedValue({
      isPersisted: true,
      timestamps: { incomeStatement: '10:00' },
    });

    const { result } = renderStage();
    await waitFor(() => expect(result.current.reportsPersisted).toBe(true));
    expect(result.current.timestamps).toEqual({ incomeStatement: '10:00' });

    mockPersistence.mockResolvedValue({ isPersisted: false, timestamps: {} });
    await act(() => result.current.refresh?.());

    await waitFor(() => expect(result.current.reportsPersisted).toBe(false));
    expect(result.current.timestamps).toEqual({});
  });
});
