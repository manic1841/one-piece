import { useCallback, useEffect, useState } from 'react';

import { type ProjectSnapshot } from '@/domains/project/schemas';
import {
  type ProjectDetailData,
  toDetailItem,
  toSnapshotDetailItem,
} from '@/domains/project/types/detail';

import { useProjectCmds } from './useProjectCmds';
import { useProjectQueries } from './useProjects';

export const useProjectDetailView = (householdId: string, projectId: string) => {
  const { getProjectRecords, getProjectSnapshots } = useProjectQueries(householdId);
  const [items, setItems] = useState<ProjectDetailData[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('current');
  const [currentSnapshot, setCurrentSnapshot] = useState<ProjectSnapshot | null>(null);

  const load = useCallback(async () => {
    if (!householdId || !projectId) return;

    const [records, snapshots] = await Promise.all([
      selectedYearMonth === 'current'
        ? getProjectRecords(projectId)
        : getProjectRecords(projectId, selectedYearMonth),
      getProjectSnapshots(projectId),
    ]);

    // Update history list (sorted DESC)
    const yearMonths = (snapshots || []).map(
      (s) => `${s.year}-${s.month.toString().padStart(2, '0')}`,
    );
    setHistory([...new Set(yearMonths)].sort((a, b) => b.localeCompare(a)));

    const recordItems = (records || []).map(toDetailItem);

    if (selectedYearMonth !== 'current') {
      const snapshot = snapshots?.find(
        (s) => `${s.year}-${s.month.toString().padStart(2, '0')}` === selectedYearMonth,
      );
      setCurrentSnapshot(snapshot || null);

      const snapshotItems = snapshot ? [toSnapshotDetailItem(snapshot)] : [];
      setItems([...snapshotItems, ...recordItems]);
    } else {
      setCurrentSnapshot(null);
      const snapshotItems = (snapshots || []).map(toSnapshotDetailItem);
      const merged = [...recordItems, ...snapshotItems].sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      );
      setItems(merged);
    }
  }, [householdId, projectId, selectedYearMonth, getProjectRecords, getProjectSnapshots]);

  useEffect(() => {
    const init = async () => {
      await load();
    };
    init();
  }, [load]);

  const { deleteSnapshot: deleteSnapshotCmd } = useProjectCmds(householdId);

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!projectId) return;
      await deleteSnapshotCmd(projectId, snapshotId);
      await load();
    },
    [projectId, deleteSnapshotCmd, load],
  );

  return {
    items,
    history,
    selectedYearMonth,
    setSelectedYearMonth,
    currentSnapshot,
    reload: load,
    deleteSnapshot,
  };
};
