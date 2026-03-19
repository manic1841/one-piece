import { type DebtAccount } from '@/domains/debt/schemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';

export interface ListDebtAccountsRequest {
  householdId: string;
}

export class ListDebtAccountsUseCase {
  async execute(request: ListDebtAccountsRequest): Promise<DebtAccount[]> {
    return debtAccountRepository.getDebtAccounts(request.householdId);
  }
}

export const listDebtAccountsUseCase = new ListDebtAccountsUseCase();
