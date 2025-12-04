import { useRecords } from '@/hooks/useRecords';
import { useRecordStats } from '@/hooks/useRecordStats';
import { useRecordCommands } from '@/hooks/useRecordCommand';

export const useRecordPage = (householdId?: string, email?: string) => {
  const { records, reload, loading, error } = useRecords(householdId);
  const stats = useRecordStats(records);
  const { createRecord, updateRecord, deleteRecord } = useRecordCommands(
    householdId,
    email,
    reload,
  );

  return {
    records,
    stats,
    loading,
    error,
    loadRecords: reload,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
