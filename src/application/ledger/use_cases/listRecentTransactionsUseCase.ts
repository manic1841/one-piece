import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Transaction } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ListRecentTransactionsRequest {
  householdId: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  auth: AuthContext;
}

export class ListRecentTransactionsUseCase {
  async execute(request: ListRecentTransactionsRequest): Promise<Transaction[]> {
    const { householdId, limit = 100, startDate, endDate, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    if (startDate || endDate) {
      const normalizedStartDate = startDate ?? new Date('1970-01-01T00:00:00.000Z');
      const normalizedEndDate = endDate ?? new Date('9999-12-31T23:59:59.999Z');

      const rangeData = await transactionRepository.listByDateRange(
        householdId,
        normalizedStartDate,
        normalizedEndDate,
      );

      return rangeData.slice(0, limit);
    }

    return transactionRepository.getRecentTransactions(householdId, limit);
  }
}

export const listRecentTransactionsUseCase = new ListRecentTransactionsUseCase();
