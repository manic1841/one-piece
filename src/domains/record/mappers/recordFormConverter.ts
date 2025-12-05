import { RecordFormType, type Record, type RecordFormData } from '@/domains/record/types';
import { toDateString } from '@/utils/dateUtils';
import { nullOrData } from '@/constants/empty';

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
    projectId: record.projectId || '',
    description: record.description,
    allocations:
      record.allocations?.map((alloc) => ({
        projectId: alloc.projectId,
        percentage: alloc.percentage.toString(),
      })) || [],
    fromProjectId: record.fromProjectId || '',
    toProjectId: record.toProjectId || '',
  };
};

export const buildRecord = (formData: RecordFormData, prevRecord?: Record): Record => {
  return {
    ...prevRecord,
    formType: formData.formType,
    amount: parseFloat(formData.amount),
    date: new Date(formData.date),
    category: formData.category,
    description: formData.description,
    projectId: nullOrData(formData.projectId),
    toProjectId: nullOrData(formData.toProjectId),
    fromProjectId: nullOrData(formData.fromProjectId),
    allocations: formData.allocations?.map((alloc) => ({
      projectId: alloc.projectId,
      percentage: parseFloat(alloc.percentage),
    })),
  } as Record;
};
