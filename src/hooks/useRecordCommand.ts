import { type Record } from '@/domains/record/record';
import { recordService } from '@/services/recordService';

export const useRecordCommands = (
  householdId?: string,
  email?: string,
  reload?: () => Promise<void>,
) => {
  const createRecord = async (record: Record) => {
    if (!householdId || !email) return;
    await recordService.createRecord(householdId, record, email);
    await reload?.();
  };

  const updateRecord = async (record: Record) => {
    if (!householdId || !email || !record.id) return;
    await recordService.updateRecord(householdId, record.id, record, email);
    await reload?.();
  };

  const deleteRecord = async (record: Record) => {
    if (!householdId || !record.id) return;
    await recordService.deleteRecord(householdId, record);
    await reload?.();
  };

  return { createRecord, updateRecord, deleteRecord };
};
