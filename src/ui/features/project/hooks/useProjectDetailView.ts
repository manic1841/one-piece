import { useCallback, useEffect, useState } from 'react';

import { PROJECT_DETAIL_LABELS } from '@/ui/constants/project/projectDetailLabels';
import {
  type ProjectMonthGroup,
  type ProjectSnapshotItemVM,
  type ProjectTotals,
  mapSnapshotToProjectDetailVM,
  mapTransactionToProjectDetailVM,
  toLatestSnapshot,
  toProjectMonthGroups,
  toRecentTotals,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { useProjectQueries } from './useProjects';

const EMPTY_TOTALS: ProjectTotals = { income: 0, expense: 0, net: 0 };

export const useProjectDetailView = (householdId: string, projectId: string) => {
  const { getProjectRecords, getProjectSnapshots } = useProjectQueries(householdId);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });
  const [monthGroups, setMonthGroups] = useState<ProjectMonthGroup[]>([]);
  const [totals, setTotals] = useState<ProjectTotals>(EMPTY_TOTALS);
  const [latestSnapshot, setLatestSnapshot] = useState<ProjectSnapshotItemVM | null>(null);

  const load = useCallback(async () => {
    await run(
      async () => {
        if (!householdId || !projectId) return null;

        const [recordsResult, snapshotsResult] = await Promise.all([
          getProjectRecords(projectId),
          getProjectSnapshots(projectId),
        ]);

        if (recordsResult.ok === false && recordsResult.kind === 'failed') {
          throw recordsResult.error;
        }
        if (snapshotsResult.ok === false && snapshotsResult.kind === 'failed') {
          throw snapshotsResult.error;
        }

        return {
          records: recordsResult.ok ? recordsResult.value : [],
          snapshots: snapshotsResult.ok ? snapshotsResult.value : [],
        };
      },
      {
        writeBack: (result) => {
          if (!result.ok) return;
          const records = result.value?.records ?? [];
          const snapshots = result.value?.snapshots ?? [];
          const groupVMs = snapshots.map(mapSnapshotToProjectDetailVM);
          const groups = toProjectMonthGroups(
            records.map(mapTransactionToProjectDetailVM),
            groupVMs,
          );
          setMonthGroups(groups);
          setTotals(toRecentTotals(groups));
          setLatestSnapshot(toLatestSnapshot(groupVMs));
        },
      },
    );
  }, [householdId, projectId, getProjectRecords, getProjectSnapshots, run]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    monthGroups,
    totals,
    latestSnapshot,
    loading,
    error: errorMessage === null ? null : PROJECT_DETAIL_LABELS.LOAD_ERROR,
    reload: load,
  };
};
