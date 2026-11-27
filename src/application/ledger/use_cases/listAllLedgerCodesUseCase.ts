import { limit, orderBy } from 'firebase/firestore';

import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { LEDGER_CODES } from '@/domains/ledger/constants/ledgerCodes';
import { type CustomLedgerCode } from '@/domains/ledger/schemas';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';
import { LEDGER_CODE_LIST_LIMIT } from '@/shared/readLimits';

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

    const systemCodes: LedgerCodeEntry[] = Object.values(LEDGER_CODES).map((code) => ({
      code,
      label: labelResolver(code),
      type: code.split(':')[0] as CustomLedgerCode['type'],
      isCustom: false,
      isActive: true,
    }));

    const customCodes: CustomLedgerCode[] = await withReadPermission(householdId, auth, () =>
      includeInactive
        ? customLedgerCodeRepository.list(
            [householdId],
            [orderBy('__name__'), limit(LEDGER_CODE_LIST_LIMIT)],
          )
        : customLedgerCodeRepository.listActive(householdId),
    );

    const customItems: LedgerCodeEntry[] = customCodes.map((custom) => ({
      code: custom.code,
      label: custom.label || labelResolver(custom.code),
      type: custom.type,
      isCustom: true,
      isActive: custom.isActive,
    }));

    // A household code reuses the system code as its document id, so it shadows
    // that system code rather than adding a second row with the same value.
    const shadowed = new Set(customItems.map((item) => item.code));
    return [...systemCodes.filter((code) => !shadowed.has(code.code)), ...customItems];
  }
}

export const listAllLedgerCodesUseCase = new ListAllLedgerCodesUseCase();
