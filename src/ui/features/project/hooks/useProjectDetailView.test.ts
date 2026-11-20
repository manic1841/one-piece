import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Transaction } from '@/domains/ledger/schemas';
import { type ProjectSnapshot } from '@/domains/project/schemas';

import { useProjectDetailView } from './useProjectDetailView';

const getProjectRecords = vi.fn();
const getProjectSnapshots = vi.fn();
const getProjectBalance = vi.fn();

vi.mock('./useProjects', () => ({
  useProjectQueries: () => ({ getProjectRecords, getProjectSnapshots, getProjectBalance }),
}));

const ok = <T>(value: T) => ({ ok: true as const, value });

const record = (overrides: Partial<Transaction> = {}) =>
  ({
    id: 'tx-1',
    date: new Date('2026-11-02'),
    amount: 500,
    intentType: 'INCOME',
    intent: 'SALARY',
    entries: [],
    ...overrides,
  }) as Transaction;

const snapshot = (overrides: Partial<ProjectSnapshot> = {}) =>
  ({
    id: '2026-10',
    year: 2026,
    month: 10,
    openingBalance: 1000,
    income: 300,
    expense: 100,
    closingBalance: 1200,
    ...overrides,
  }) as ProjectSnapshot;

describe('useProjectDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectRecords.mockResolvedValue(ok([] as Transaction[]));
    getProjectSnapshots.mockResolvedValue(ok([] as ProjectSnapshot[]));
    getProjectBalance.mockResolvedValue(
      ok({ balance: 1200, year: 2026, month: 11, lastSettledYearMonth: '2026-10' }),
    );
  });

  it('asks for a 12-month window and probes one month before it', async () => {
    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const [windowCall] = getProjectRecords.mock.calls[0];
    expect(windowCall).toBe('p1');
    const windowQuery = getProjectRecords.mock.calls[0][1];
    expect(windowQuery.fromYearMonth < windowQuery.toYearMonth).toBe(true);
    // The probe asks for a single record ending before the window starts.
    expect(getProjectRecords.mock.calls[1][1]).toEqual({
      toYearMonth: expect.any(String),
      limit: 1,
    });
    expect(getProjectRecords.mock.calls[1][1].toYearMonth < windowQuery.fromYearMonth).toBe(true);
  });

  it('reports more months only when the probe finds older data', async () => {
    getProjectSnapshots.mockImplementation(async (_projectId, options) =>
      ok((options as { limit?: number } | undefined)?.limit ? [snapshot()] : []),
    );

    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
  });

  it('widens the window by 12 months per load more', async () => {
    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    const firstFrom = getProjectRecords.mock.calls[0][1].fromYearMonth as string;
    const secondFrom = getProjectRecords.mock.calls[2][1].fromYearMonth as string;
    expect(secondFrom < firstFrom).toBe(true);
  });

  it('renders a live balance with its settle context', async () => {
    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.balance).toBe(1200));
    expect(result.current.lastSettledYearMonth).toBe('2026-10');
  });

  it('surfaces a balance failure without blanking the panel', async () => {
    getProjectBalance.mockResolvedValue({ ok: false, kind: 'failed', error: new Error('boom') });
    getProjectRecords.mockResolvedValue(ok([record()]));

    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.balanceError).not.toBeNull());
    expect(result.current.balance).toBeNull();
    expect(result.current.monthGroups).toHaveLength(1);
  });

  it('rolls the newest month forward from the balance', async () => {
    getProjectRecords.mockResolvedValue(ok([record()]));

    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.balance).not.toBeNull());
    const [group] = result.current.monthGroups;
    expect(group.closingBalance).toBe(1200);
    expect(group.openingBalance).toBe(700);
  });

  it('leaves "more" unknown when the probe fails (ADR-0072)', async () => {
    getProjectRecords.mockImplementation(async (_projectId, options) =>
      (options as { limit?: number } | undefined)?.limit
        ? { ok: false, kind: 'failed', error: new Error('probe boom') }
        : ok([] as Transaction[]),
    );
    getProjectSnapshots.mockImplementation(async (_projectId, options) =>
      (options as { limit?: number } | undefined)?.limit
        ? { ok: false, kind: 'failed', error: new Error('probe boom') }
        : ok([] as ProjectSnapshot[]),
    );

    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBeNull();
  });

  it('re-anchors the window to future-dated data so it never falls off the end', async () => {
    getProjectRecords.mockImplementation(async (_projectId, options) =>
      (options as { limit?: number } | undefined)?.limit
        ? ok([] as Transaction[])
        : ok([record({ date: new Date('2099-03-02') })]),
    );

    const { result } = renderHook(() => useProjectDetailView('h1', 'p1'));

    await waitFor(() => expect(result.current.monthGroups[0]?.key).toBe('2099-03'));
    const lastWindow = getProjectRecords.mock.calls
      .filter(([, options]) => !(options as { limit?: number } | undefined)?.limit)
      .at(-1)?.[1] as { toYearMonth: string };
    expect(lastWindow.toYearMonth).toBe('2099-03');
  });
});
