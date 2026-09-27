import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { type CustomLedgerCode } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';

export interface LedgerCodeEntry {
  code: string;
  label: string;
  type: CustomLedgerCode['type'];
  isCustom: boolean;
  isActive: boolean;
}

export interface ListAllLedgerCodesRequest {
  householdId: string;
  includeInactive?: boolean;
  auth: AuthContext;
  /** Resolves display labels for system codes; custom codes keep their stored label. */
  labelResolver: (code: string) => string;
}

/**
 * Single enumeration seam for a household's ledger codes: system defaults from
 * the LEDGER_CODES constant plus household-defined custom codes from Firestore.
 * Labels come from the injected resolver (custom codes fall back to it only
 * when they carry no stored label), keeping this module free of UI wording
 * per docs/ui/ui-labeling-guideline.md.
 */
export class ListAllLedgerCodesUseCase {
  async execute(request: ListAllLedgerCodesRequest): Promise<LedgerCodeEntry[]> {
    const { householdId, includeInactive = false, auth, labelResolver } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const systemCodes: LedgerCodeEntry[] = Object.values(LEDGER_CODES).map((code) => ({
      code,
      label: labelResolver(code),
      type: code.split(':')[0] as CustomLedgerCode['type'],
      isCustom: false,
      isActive: true,
    }));

    const customCodes: CustomLedgerCode[] = includeInactive
      ? await customLedgerCodeRepository.list([householdId])
      : await customLedgerCodeRepository.listActive(householdId);

    const customItems: LedgerCodeEntry[] = customCodes.map((custom) => ({
      code: custom.code,
      label: custom.label || labelResolver(custom.code),
      type: custom.type,
      isCustom: true,
      isActive: custom.isActive,
    }));

    return [...systemCodes, ...customItems];
  }
}

export const listAllLedgerCodesUseCase = new ListAllLedgerCodesUseCase();
