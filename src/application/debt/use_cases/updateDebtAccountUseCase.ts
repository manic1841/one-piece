import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type DebtAccountCreate, DEBT_TYPE_LEDGER_CODE } from '@/domains/debt/schemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';

export interface UpdateDebtAccountRequest {
  householdId: string;
  debtAccountId: string;
  data: Partial<Omit<DebtAccountCreate, 'linkedLedgerCode'>>;
  userEmail: string;
  auth: AuthContext;
}

export class UpdateDebtAccountUseCase {
  async execute(request: UpdateDebtAccountRequest): Promise<void> {
    const { householdId, debtAccountId, data, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    // Re-derive linkedLedgerCode if type is being updated
    const updates: Partial<DebtAccountCreate> = { ...data };
    if (data.type) {
      updates.linkedLedgerCode = DEBT_TYPE_LEDGER_CODE[data.type];
    }

    await debtAccountRepository.updateDebtAccount(householdId, debtAccountId, updates, userEmail);
  }
}

export const updateDebtAccountUseCase = new UpdateDebtAccountUseCase();
