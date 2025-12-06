import { type ProjectDetailData, ProjectDetailType } from '@/domains/project/types';
import { type ProjectTransaction, type Transaction, TransactionType } from '@/domains/record/types';

export const toDetailItem = (data: Transaction | ProjectTransaction): ProjectDetailData => {
  if ('projectId' in data) {
    // It's a Transaction
    return {
      id: data.id,
      type:
        data.type === TransactionType.INCOME ? ProjectDetailType.INCOME : ProjectDetailType.EXPENSE,
      date: data.date,
      category: data.category,
      amount: data.amount,
      description: data.description || '',
      label: '',
    };
  } else if ('fromProjectId' in data || 'toProjectId' in data) {
    // It's a ProjectTransaction
    return {
      id: data.id,
      type: data.fromProjectId
        ? ProjectDetailType.TRANSFER_EXPENSE
        : ProjectDetailType.TRANSFER_INCOME,
      category: data.category,
      date: data.date,
      amount: data.amount,
      description: data.description || '',
      label: data.category || '',
    };
  }

  throw new Error('Unsupported data type for toDetailItem');
};
