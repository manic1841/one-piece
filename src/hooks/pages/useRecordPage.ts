import { useEffect, useState } from 'react';

import { filterRecords } from '@/domains/record/filter';
import { type Record, RecordFilterType } from '@/domains/record/types';
import { useRecordCmds } from '@/hooks/useRecordCmds';
import { useRecords } from '@/hooks/useRecords';
import { useRecordStats } from '@/hooks/useRecordStats';

export const useRecordPage = (householdId?: string, email?: string) => {
  const { records, reload, loading, error } = useRecords(householdId);
  const stats = useRecordStats(records);
  const { createRecord, updateRecord, deleteRecord } = useRecordCmds(householdId, email, reload);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record | undefined>(undefined);
  const [filterType, setFilterType] = useState<RecordFilterType>(RecordFilterType.ALL);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);

  // filter records
  useEffect(() => {
    const filter = async () => {
      const filtered = filterRecords(records, filterType);
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
    if (!confirm(`Are you sure you want to delete record? This action cannot be undone.`)) {
      return;
    }
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
