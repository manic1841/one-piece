import { useState, useEffect } from 'react';
import { useRecords } from '@/hooks/useRecords';
import { useRecordStats } from '@/hooks/useRecordStats';
import { useRecordCommands } from '@/hooks/useRecordCommand';
import { type Record, RecordFilterType } from '@/domains/record/types';
import { filterRecords } from '@/domains/record/filter';

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
    console.log('Creating record:', record);
    await createRecord(record);
  };

  // update record
  const update = async (record: Record) => {
    console.log('Updating record:', record, editing);
    if (!editing) return;
    await updateRecord(record);
    setEditing(undefined);
  };

  // edit record
  const editClick = (record: Record) => {
    console.log('Editing record:', record);
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
