import { useCallback, useEffect, useState } from 'react';

import { toDetailItem } from '@/domains/project/mappers/toDetailItem';
import { toSnapshotDetailItem } from '@/domains/project/mappers/toSnapshotDetailItem';
import { type ProjectDetailData } from '@/domains/project/types';
import { useProjectCmds } from '@/hooks/useProjectCmds';

export const useProjectDetailView = (householdId?: string, projectId?: string) => {
  const { getRecords, getSnapshots } = useProjectCmds(householdId);

  const [items, setItems] = useState<ProjectDetailData[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!householdId || !projectId) return;

      const [records, snapshots] = await Promise.all([
        getRecords(projectId),
        getSnapshots(projectId),
      ]);

      if (!isMounted) return;

      const recordItems = (records || []).map(toDetailItem);
      const snapshotItems = (snapshots || []).map(toSnapshotDetailItem);

      // Merge and sort DESC
      const merged = [...recordItems, ...snapshotItems].sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      );

      setItems(merged);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [householdId, projectId, getRecords, getSnapshots]);

  const reload = useCallback(async () => {
    const [records, snapshots] = await Promise.all([
      getRecords(projectId!),
      getSnapshots(projectId!),
    ]);

    const recordItems = (records || []).map(toDetailItem);
    const snapshotItems = (snapshots || []).map(toSnapshotDetailItem);

    const merged = [...recordItems, ...snapshotItems].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );

    setItems(merged);
  }, [projectId, getRecords, getSnapshots]);

  const { deleteSnapshot: deleteSnapshotCmd } = useProjectCmds(householdId);

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!projectId) return;
      await deleteSnapshotCmd(projectId, snapshotId);
      await reload();
    },
    [projectId, deleteSnapshotCmd, reload],
  );

  return { items, reload, deleteSnapshot };
};
