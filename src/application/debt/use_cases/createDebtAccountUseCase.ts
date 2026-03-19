import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type DebtAccountCreate, DEBT_TYPE_LEDGER_CODE } from '@/domains/debt/schemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';

export interface CreateDebtAccountRequest {
  householdId: string;
  data: Omit<DebtAccountCreate, 'linkedLedgerCode'>;
  userEmail: string;
  auth: AuthContext;
}

export class CreateDebtAccountUseCase {
  async execute(request: CreateDebtAccountRequest): Promise<string> {
    const { householdId, data, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    const payload: DebtAccountCreate = {
      ...data,
      linkedLedgerCode: DEBT_TYPE_LEDGER_CODE[data.type],
    };

    return debtAccountRepository.createDebtAccount(householdId, payload, userEmail);
  }
}

export const createDebtAccountUseCase = new CreateDebtAccountUseCase();
