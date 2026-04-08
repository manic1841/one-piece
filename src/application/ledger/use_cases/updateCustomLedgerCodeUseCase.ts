import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type CustomLedgerCodeCreate } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface UpdateCustomLedgerCodeRequest {
  householdId: string;
  ledgerCode: string;
  userEmail: string;
  auth: AuthContext;
  data: Partial<CustomLedgerCodeCreate>;
}

export class UpdateCustomLedgerCodeUseCase {
  async execute(request: UpdateCustomLedgerCodeRequest): Promise<void> {
    const { householdId, ledgerCode, userEmail, auth, data } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await customLedgerCodeRepository.update([householdId, ledgerCode], data, userEmail);
  }
}

export const updateCustomLedgerCodeUseCase = new UpdateCustomLedgerCodeUseCase();
