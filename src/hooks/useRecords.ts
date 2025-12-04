import { useState, useEffect, useCallback } from 'react';
import { type Record } from '@/domains/record/record';
import { recordService } from '@/services/recordService';
import { useLoadingTask } from '@/hooks/useLoadingTask';

export const useRecords = (householdId?: string) => {
  const { loading, error, run } = useLoadingTask();
  const [records, setRecords] = useState<Record[]>([]);

  const loadRecords = useCallback(
    async () =>
      run(async () => {
        if (!householdId) return;
        const data = await recordService.getRecords(householdId);
        setRecords(data);
      }),
    [run, householdId],
  );

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return {
    records,
    loading,
    error,
    reload: loadRecords,
  };
};
