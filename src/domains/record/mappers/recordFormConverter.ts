import { RecordFormType, type Record, type RecordFormData } from '@/domains/record/types';

export const toRecordFormData = (record?: Record): RecordFormData => {
  // default empty form
  if (!record) {
    return {
      amount: '',
      formType: RecordFormType.EXPENSE,
      date: new Date().toDateString(),
      category: '',
      projectId: '',
      description: '',
      allocations: [] as Array<{ projectId: string; percentage: string }>,
      fromProjectId: '',
      toProjectId: '',
    };
  }

  return {
    amount: record.amount.toString(),
    formType: record.formType,
    date: record.date.toDateString(),
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

export const buildRecord = (formData: RecordFormData): Record => {
  return {
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
