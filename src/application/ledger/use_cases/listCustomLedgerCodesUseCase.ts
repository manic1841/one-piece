import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type CustomLedgerCode } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface ListCustomLedgerCodesRequest {
  householdId: string;
  includeInactive?: boolean;
  auth: AuthContext;
}

export class ListCustomLedgerCodesUseCase {
  async execute(request: ListCustomLedgerCodesRequest): Promise<CustomLedgerCode[]> {
    const { householdId, includeInactive = false, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return includeInactive
      ? customLedgerCodeRepository.list([householdId])
      : customLedgerCodeRepository.listActive(householdId);
  }
}

export const listCustomLedgerCodesUseCase = new ListCustomLedgerCodesUseCase();
