import { type IntentMappingInfo } from '@/domains/ledger/intentMapping';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';

/**
 * Resolves the selectable set for an intent that lets the user pick the counter
 * code. Returns null when the intent has no user-select side.
 *
 * Two modes (ADR-0009):
 * - `allowed*Prefix`: every code under that prefix, i.e. the children of one
 *   category (a 明細科目 selection).
 * - `*CustomOnly`: the mapping's own code plus the household's custom codes of
 *   that type — system codes are reached through their own dedicated intent.
 */
export function buildUserSelectOptions(
  mapping: IntentMappingInfo | undefined,
  allLedgerCodes: LedgerCodeItem[],
): LedgerCodeItem[] | null {
  if (!mapping) return null;

  const side = mapping.debitUserSelect
    ? {
        prefix: mapping.allowedDebitPrefix,
        customOnly: mapping.debitCustomOnly,
        fallbackCode: mapping.debitLedgerCode,
      }
    : mapping.creditUserSelect
      ? {
          prefix: mapping.allowedCreditPrefix,
          customOnly: mapping.creditCustomOnly,
          fallbackCode: mapping.creditLedgerCode,
        }
      : null;

  if (!side) return null;

  if (side.customOnly) {
    const type = side.fallbackCode.split(':')[0];
    const fallback = allLedgerCodes.find((code) => code.code === side.fallbackCode);
    const customCodes = allLedgerCodes.filter(
      (code) =>
        code.isCustom && code.code !== side.fallbackCode && code.code.startsWith(`${type}:`),
    );
    return [...(fallback ? [fallback] : []), ...customCodes];
  }

  if (!side.prefix) return null;
  return allLedgerCodes.filter((code) => code.code.startsWith(side.prefix as string));
}
