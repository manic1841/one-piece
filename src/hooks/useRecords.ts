import { type Record } from '@/domains/record/types';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { recordService } from '@/services/recordService';
import { useCallback, useEffect, useState } from 'react';

export const useRecords = (householdId?: string) => {
  const { loading, error, run } = useLoadingTask();
  const [records, setRecords] = useState<Record[]>([]);

  const load = useCallback(
    async () =>
      run(async () => {
        if (!householdId) return;
        const data = await recordService.getRecords(householdId);
        setRecords(data);
      }),
    [run, householdId],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    records,
    loading,
    error,
    reload: load,
  };
};
