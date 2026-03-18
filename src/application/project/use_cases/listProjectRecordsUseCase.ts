import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type Transaction } from '@/domains/ledger/schemas';

export interface ListProjectRecordsRequest {
  householdId: string;
  projectId: string;
  yearMonth?: string;
}

export class ListProjectRecordsUseCase {
  async execute(request: ListProjectRecordsRequest): Promise<Transaction[]> {
    const { householdId, projectId, yearMonth } = request;
    if (yearMonth) {
      return transactionRepository.getTransactionsByProject(householdId, projectId, yearMonth);
    }
    return transactionRepository.listByProject(householdId, projectId);
  }
}

export const listProjectRecordsUseCase = new ListProjectRecordsUseCase();
