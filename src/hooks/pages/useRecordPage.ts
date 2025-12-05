import { useState, useEffect } from 'react';
import { useRecords } from '@/hooks/useRecords';
import { useRecordStats } from '@/hooks/useRecordStats';
import { useRecordCommands } from '@/hooks/useRecordCommand';
import { type Record, RecordType, TransactionType } from '@/domains/record/types';

export const useRecordPage = (householdId?: string, email?: string) => {
  const { records, reload, loading, error } = useRecords(householdId);
  const stats = useRecordStats(records);
  const { createRecord, updateRecord, deleteRecord } = useRecordCommands(
    householdId,
    email,
    reload,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record | undefined>(undefined);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);

  // filter records
  useEffect(() => {
    const filter = async () => {
      const filtered = records.filter((item) => {
        if (filterType === 'all') return true;
        if (filterType === 'income') {
          return (
            item.recordType === RecordType.PLANNED_INCOME ||
            (item.recordType === RecordType.TRANSACTION &&
              item.transactionType === TransactionType.INCOME)
          );
        }
        if (filterType === 'expense') {
          return (
            item.recordType === RecordType.TRANSACTION &&
            item.transactionType === TransactionType.EXPENSE
          );
        }
        return true;
      });
      setFilteredRecords(filtered);
    };
    filter();
  }, [filterType, records]);

  // create record
  const create = async (record: Record) => {
    await createRecord(record);
  };

  // update record
  const update = async (record: Record) => {
    if (!editing) return;
    await updateRecord(record);
    setEditing(undefined);
  };

  // edit record
  const editClick = (record: Record) => {
    setEditing(record);
    setIsFormOpen(true);
  };

  // delete record
  const deleteClick = (record: Record) => {
    deleteRecord(record);
  };

  // open form
  const openForm = () => {
    setIsFormOpen(true);
  };

  // close form
  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  return {
    loading,
    error,
    stats,
    records,
    reload,
    filterType,
    setFilterType,
    filteredRecords,
    isFormOpen,
    openForm,
    closeForm,
    editing,
    editClick,
    deleteClick,
    create,
    update,
  };
};
