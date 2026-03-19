import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';

export interface RemoveDebtAccountRequest {
  householdId: string;
  debtAccountId: string;
  userEmail: string;
  auth: AuthContext;
}

export interface RemoveDebtAccountResult {
  strategy: 'deactivated' | 'deleted';
}

/**
 * Smart delete:
 *   - Has LIABILITY_PAYMENT transactions → soft delete (isActive: false)
 *   - No payments → hard delete
 */
export class RemoveDebtAccountUseCase {
  async execute(request: RemoveDebtAccountRequest): Promise<RemoveDebtAccountResult> {
    const { householdId, debtAccountId, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    const hasPayments = await debtAccountRepository.checkHasPayments(householdId, debtAccountId);

    if (hasPayments) {
      await debtAccountRepository.deactivateDebtAccount(householdId, debtAccountId, userEmail);
      return { strategy: 'deactivated' };
    } else {
      await debtAccountRepository.deleteDebtAccount(householdId, debtAccountId);
      return { strategy: 'deleted' };
    }
  }
}

export const removeDebtAccountUseCase = new RemoveDebtAccountUseCase();
