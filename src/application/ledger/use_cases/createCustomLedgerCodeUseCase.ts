import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { type LedgerCodeCandidate, validateNewLedgerCode } from '@/domains/ledger/ledgerCodeRules';
import { type CustomLedgerCodeCreate } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface CreateCustomLedgerCodeRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  /** `type:category` or `type:category:detail`; the type prefix is authoritative. */
  code: string;
  label: string;
  isActive?: boolean;
}

/**
 * Creates a household-defined ledger code (ADR-0009).
 *
 * The caller supplies the code only — `type` is derived from the code's own prefix,
 * and a 明細科目 is rejected unless its depth-2 parent exists and is active.
 */
export class CreateCustomLedgerCodeUseCase {
  async execute(request: CreateCustomLedgerCodeRequest): Promise<void> {
    const { householdId, userEmail, auth, code, label, isActive = true } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const systemCandidates: LedgerCodeCandidate[] = Object.values(LEDGER_CODES).map(
      (systemCode) => ({
        code: systemCode,
        type: systemCode.split(':')[0],
        isActive: true,
      }),
    );
    const customCandidates = await customLedgerCodeRepository.list([householdId]);

    const validation = validateNewLedgerCode(code, [...systemCandidates, ...customCandidates]);
    if (!validation.valid) {
      throw new Error(`Invalid ledger code ${code}: ${validation.violation}`);
    }

    const data: CustomLedgerCodeCreate = {
      code,
      label,
      type: validation.type as CustomLedgerCodeCreate['type'],
      isCustom: true,
      isActive,
      createdBy: userEmail,
    };

    await customLedgerCodeRepository.createCustomCode(householdId, data, userEmail);
  }
}

export const createCustomLedgerCodeUseCase = new CreateCustomLedgerCodeUseCase();
