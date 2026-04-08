import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type CustomLedgerCodeCreate } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface CreateCustomLedgerCodeRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  data: CustomLedgerCodeCreate;
}

export class CreateCustomLedgerCodeUseCase {
  async execute(request: CreateCustomLedgerCodeRequest): Promise<void> {
    const { householdId, userEmail, auth, data } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    await customLedgerCodeRepository.createCustomCode(householdId, data, userEmail);
  }
}

export const createCustomLedgerCodeUseCase = new CreateCustomLedgerCodeUseCase();
