import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  LOAD_MORE_STEP_MONTHS,
  buildMonthWindow,
  shiftYearMonth,
  toYearMonth,
} from '@/application/project/monthWindow';
import { PROJECT_DETAIL_LABELS } from '@/ui/constants/project/projectDetailLabels';
import {
  type ProjectMonthGroup,
  type ProjectRecordItemVM,
  type ProjectSnapshotItemVM,
  type ProjectTotals,
  mapSnapshotToProjectDetailVM,
  mapTransactionToProjectDetailVM,
  toProjectMonthGroups,
  toRecentTotals,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { useProjectQueries } from './useProjects';

const EMPTY_TOTALS: ProjectTotals = { income: 0, expense: 0, net: 0 };

const currentYearMonth = (): string => toYearMonth(new Date());

export const useProjectDetailView = (householdId: string, projectId: string) => {
  const { getProjectRecords, getProjectSnapshots, getProjectBalance } =
    useProjectQueries(householdId);
  const { errorMessage, run } = useLoadingTask({ initiallyLoading: true });
  const {
    run: runBalance,
    loading: balanceLoading,
    errorMessage: balanceErrorDetail,
  } = useLoadingTask({ initiallyLoading: true });

  const [records, setRecords] = useState<ProjectRecordItemVM[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSnapshotItemVM[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastSettledYearMonth, setLastSettledYearMonth] = useState<string | null>(null);
  const [monthsLoaded, setMonthsLoaded] = useState(LOAD_MORE_STEP_MONTHS);
  // The window's newest month follows future-dated data when there is any, so a
  // record booked ahead never falls off the newest end.
  const [endYearMonth, setEndYearMonth] = useState(currentYearMonth);
  // null means the probe failed: "more months" is UNKNOWN, not empty (ADR-0072).
  const [hasMore, setHasMore] = useState<boolean | null>(null);
  // The first paint is gated; later loads (load more, reload) refresh in place so
  // the balance and summary never blink back to a skeleton.
  const [initialised, setInitialised] = useState(false);

  const loadBalance = useCallback(async () => {
    await runBalance(
      async () => {
        if (!householdId || !projectId) return null;
        const result = await getProjectBalance(projectId);
        if (result.ok === false && result.kind === 'failed') throw result.error;
        return result.ok ? result.value : null;
      },
      {
        writeBack: (result) => {
          if (!result.ok) return;
          setBalance(result.value?.balance ?? null);
          setLastSettledYearMonth(result.value?.lastSettledYearMonth ?? null);
        },
      },
    );
  }, [householdId, projectId, getProjectBalance, runBalance]);

  const load = useCallback(async () => {
    await run(
      async () => {
        if (!householdId || !projectId) return null;

        const window = buildMonthWindow(endYearMonth, monthsLoaded);
        // One month before the window is the probe that answers "is there more".
        const before = shiftYearMonth(window.from, -1);

        const [recordsResult, snapshotsResult, olderRecords, olderSnapshots] = await Promise.all([
          getProjectRecords(projectId, {
            fromYearMonth: window.from,
            toYearMonth: window.to,
          }),
          getProjectSnapshots(projectId, {
            fromYearMonth: window.from,
            toYearMonth: window.to,
          }),
          getProjectRecords(projectId, { toYearMonth: before, limit: 1 }),
          getProjectSnapshots(projectId, { toYearMonth: before, limit: 1 }),
        ]);

        if (recordsResult.ok === false && recordsResult.kind === 'failed') {
          throw recordsResult.error;
        }
        if (snapshotsResult.ok === false && snapshotsResult.kind === 'failed') {
          throw snapshotsResult.error;
        }

        const probeFailed =
          (olderRecords.ok === false && olderRecords.kind === 'failed') ||
          (olderSnapshots.ok === false && olderSnapshots.kind === 'failed');
        const foundOlder =
          (olderRecords.ok && olderRecords.value.length > 0) ||
          (olderSnapshots.ok && olderSnapshots.value.length > 0);

        return {
          records: recordsResult.ok ? recordsResult.value : [],
          snapshots: snapshotsResult.ok ? snapshotsResult.value : [],
          // A failed probe leaves "more" unknown rather than claiming the end.
          hasMore: foundOlder ? true : probeFailed ? null : false,
        };
      },
      {
        writeBack: (result) => {
          setInitialised(true);
          if (!result.ok) return;
          const loaded = result.value;
          if (!loaded) return;

          setRecords(loaded.records.map(mapTransactionToProjectDetailVM));
          setSnapshots(loaded.snapshots.map(mapSnapshotToProjectDetailVM));
          setHasMore(loaded.hasMore);

          // Future-dated data sits past the window's newest month; re-anchor to
          // it once. The changed dependency reloads the window.
          const newest = loaded.records[0]?.date;
          const newestMonth = newest ? toYearMonth(newest) : null;
          if (newestMonth && newestMonth > endYearMonth) setEndYearMonth(newestMonth);
        },
      },
    );
  }, [
    householdId,
    projectId,
    endYearMonth,
    monthsLoaded,
    getProjectRecords,
    getProjectSnapshots,
    run,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const groups = useMemo<ProjectMonthGroup[]>(
    () => toProjectMonthGroups(records, snapshots, balance),
    [records, snapshots, balance],
  );

  const totals = useMemo(
    () => (groups.length === 0 ? EMPTY_TOTALS : toRecentTotals(groups)),
    [groups],
  );

  const loadMore = useCallback(() => {
    setMonthsLoaded((months) => months + LOAD_MORE_STEP_MONTHS);
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([load(), loadBalance()]);
  }, [load, loadBalance]);

  return {
    monthGroups: groups,
    totals,
    balance,
    lastSettledYearMonth,
    hasMore,
    loadMore,
    loading: !initialised,
    balanceLoading,
    balanceError:
      balanceErrorDetail === null
        ? null
        : { message: PROJECT_DETAIL_LABELS.BALANCE_LOAD_ERROR, detail: balanceErrorDetail },
    error: errorMessage === null ? null : PROJECT_DETAIL_LABELS.LOAD_ERROR,
    reload,
    retryBalance: loadBalance,
  };
};
