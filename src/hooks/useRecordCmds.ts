import { useCallback } from 'react';

import { type Record } from '@/domains/record/types';
import { recordService } from '@/services/recordService';

export const useRecordCmds = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const createRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !email) return;
      await recordService.createRecord(householdId, record, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const updateRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !email || !record.id) return;
      await recordService.updateRecord(householdId, record.id, record, email);
      await reload?.();
    },
    [householdId, email, reload],
  );

  const deleteRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !record.id) return;
      await recordService.deleteRecord(householdId, record);
      await reload?.();
    },
    [householdId, reload],
  );

  return { createRecord, updateRecord, deleteRecord };
};
