import { RecordFormType, type Record, type RecordFormData } from '@/domains/record/types';
import { toDateString } from '@/utils/dateUtils';

export const toRecordFormData = (record?: Record): RecordFormData => {
  // default empty form
  if (!record) {
    return {
      formType: RecordFormType.EXPENSE,
      amount: '',
      date: toDateString(new Date()),
      category: '',
      projectId: '',
      description: '',
      allocations: [] as Array<{ projectId: string; percentage: string }>,
      fromProjectId: '',
      toProjectId: '',
    };
  }

  return {
    recordType: record.recordType,
    formType: record.formType,
    amount: record.amount.toString(),
    date: toDateString(record.date),
    category: record.category || '',
    projectId: record.mainProjectId || '',
    description: record.description,
    allocations:
      record.allocations?.map((alloc) => ({
        projectId: alloc.projectId,
        percentage: alloc.percentage.toString(),
      })) || [],
    fromProjectId: record.sourceProjectId || '',
    toProjectId: record.mainProjectId || '',
  };
};

export const buildRecord = (formData: RecordFormData, prevRecord?: Record): Record => {
  return {
    ...prevRecord,
    formType: formData.formType,
    amount: parseFloat(formData.amount),
    date: new Date(formData.date),
    category: formData.category || '',
    description: formData.description || '',
    mainProjectId: formData.toProjectId || '',
    sourceProjectId: formData.fromProjectId || '',
    allocations: formData.allocations?.map((alloc) => ({
      projectId: alloc.projectId,
      percentage: parseFloat(alloc.percentage),
    })),
  } as Record;
};
