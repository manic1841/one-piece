import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { type Record } from '@/domains/record/types';
import { recordService } from '@/services/recordService';

export const useRecordCmds = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const createRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !email) return;
      await recordService.createRecord(householdId, record, email, auth);
      await reload?.();
    },
    [householdId, email, reload, auth],
  );

  const updateRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !email || !record.id) return;
      await recordService.updateRecord(householdId, record.id, record, email, auth);
      await reload?.();
    },
    [householdId, email, reload, auth],
  );

  const deleteRecord = useCallback(
    async (record: Record) => {
      if (!householdId || !record.id) return;
      await recordService.deleteRecord(householdId, record, auth);
      await reload?.();
    },
    [householdId, reload, auth],
  );

  return { createRecord, updateRecord, deleteRecord };
};
