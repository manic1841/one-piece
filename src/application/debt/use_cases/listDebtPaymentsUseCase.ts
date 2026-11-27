import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type Transaction } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ListDebtPaymentsRequest {
  householdId: string;
  debtAccountId: string;
  auth: AuthContext;
}

export class ListDebtPaymentsUseCase {
  async execute(request: ListDebtPaymentsRequest): Promise<Transaction[]> {
    const { householdId, debtAccountId, auth } = request;

    return withReadPermission(householdId, auth, () =>
      transactionRepository.listByDebtAccount(householdId, debtAccountId),
    );
  }
}

export const listDebtPaymentsUseCase = new ListDebtPaymentsUseCase();
