import { useState, useEffect, useCallback } from 'react';
import { type Record } from '@/domains/record/types';
import { recordService } from '@/services/recordService';
import { useLoadingTask } from '@/hooks/useLoadingTask';

export const useRecords = (householdId?: string) => {
  const { loading, error, run } = useLoadingTask();
  const [records, setRecords] = useState<Record[]>([]);

  const load = useCallback(
    async () =>
      run(async () => {
        if (!householdId) return;
        const data = await recordService.getRecords(householdId);
        console.log(`Loaded ${data.length} records.`);
        setRecords(data);
      }),
    [run, householdId],
  );

  useEffect(() => {
    console.log('Loading records...');
    load();
  }, [load]);

  return {
    records,
    loading,
    error,
    reload: load,
  };
};
