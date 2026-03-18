import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type Transaction } from '@/infra/schemas/ledger';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface ListRecentTransactionsRequest {
  householdId: string;
  limit?: number;
  auth: AuthContext;
}

export class ListRecentTransactionsUseCase {
  async execute(request: ListRecentTransactionsRequest): Promise<Transaction[]> {
    const { householdId, limit = 100, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return await transactionRepository.getRecentTransactions(householdId, limit);
  }
}

export const listRecentTransactionsUseCase = new ListRecentTransactionsUseCase();
