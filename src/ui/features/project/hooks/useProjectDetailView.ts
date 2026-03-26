import { useCallback, useEffect, useState } from 'react';

import {
  type ProjectDetailItemVM,
  type ProjectSnapshotItemVM,
  mapSnapshotToProjectDetailVM,
  mapTransactionToProjectDetailVM,
} from '@/ui/features/project/viewmodels/projectDetail.vm';

import { useProjectCmds } from './useProjectCmds';
import { useProjectQueries } from './useProjects';

export const useProjectDetailView = (householdId: string, projectId: string) => {
  const { getProjectRecords, getProjectSnapshots } = useProjectQueries(householdId);
  const [items, setItems] = useState<ProjectDetailItemVM[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('current');
  const [currentSnapshot, setCurrentSnapshot] = useState<ProjectSnapshotItemVM | null>(null);

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

    const recordItems = (records || []).map(mapTransactionToProjectDetailVM);

    if (selectedYearMonth !== 'current') {
      const snapshot = snapshots?.find(
        (s) => `${s.year}-${s.month.toString().padStart(2, '0')}` === selectedYearMonth,
      );
      const snapshotVM = snapshot ? mapSnapshotToProjectDetailVM(snapshot) : null;
      setCurrentSnapshot(snapshotVM);

      const snapshotItems = snapshotVM ? [snapshotVM] : [];
      setItems([...snapshotItems, ...recordItems]);
    } else {
      setCurrentSnapshot(null);
      const snapshotItems = (snapshots || []).map(mapSnapshotToProjectDetailVM);
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
