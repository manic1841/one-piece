import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface CheckLedgerCodeInUseRequest {
  householdId: string;
  ledgerCode: string;
  auth: AuthContext;
}

export class CheckLedgerCodeInUseUseCase {
  async execute(request: CheckLedgerCodeInUseRequest): Promise<boolean> {
    const { householdId, ledgerCode, auth } = request;

    return withReadPermission(householdId, auth, () =>
      customLedgerCodeRepository.isCodeInUse(householdId, ledgerCode),
    );
  }
}

export const checkLedgerCodeInUseUseCase = new CheckLedgerCodeInUseUseCase();
