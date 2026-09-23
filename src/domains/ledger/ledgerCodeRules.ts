import { LEDGER_PREFIX } from './constants/ledgerCodes';

/**
 * Pure rules for household-defined ledger codes (ADR-0009).
 *
 * A code has the shape `type:category` (depth 2) or `type:category:detail`
 * (depth 3). Anything deeper is not expressible: a 明細科目 hangs under a
 * depth-2 code, never under another 明細科目.
 */

const LEDGER_CODE_SEGMENT = '[a-z][a-z0-9_]*';

/** `type:category` or `type:category:detail`, lowercase alphanumerics and underscores only. */
export const LEDGER_CODE_PATTERN = new RegExp(
  `^${LEDGER_CODE_SEGMENT}(:${LEDGER_CODE_SEGMENT}){1,2}$`,
);

const KNOWN_LEDGER_TYPES: readonly string[] = Object.values(LEDGER_PREFIX);

export type LedgerCodeShape = {
  type: string;
  /** The depth-2 code this code hangs under; null for depth-2 codes. */
  parent: string | null;
  depth: 2 | 3;
};

/** Returns the parsed shape, or null when the code does not match the pattern. */
export const parseLedgerCode = (code: string): LedgerCodeShape | null => {
  if (!LEDGER_CODE_PATTERN.test(code)) return null;

  const segments = code.split(':');
  if (segments.length === 2) {
    return { type: segments[0], parent: null, depth: 2 };
  }
  return { type: segments[0], parent: `${segments[0]}:${segments[1]}`, depth: 3 };
};

/** The depth-2 prefix of a code, i.e. the code itself for `type:category`. */
export const ledgerCodeParentOf = (code: string): string | null =>
  parseLedgerCode(code)?.parent ?? null;

export type LedgerCodeCandidate = {
  code: string;
  type: string;
  isActive: boolean;
};

export type LedgerCodeViolation =
  | 'INVALID_SHAPE'
  | 'UNKNOWN_TYPE'
  | 'DUPLICATE'
  | 'PARENT_MISSING'
  | 'PARENT_INACTIVE';

export type NewLedgerCodeValidation =
  | { valid: true; type: string; parent: string | null }
  | { valid: false; violation: LedgerCodeViolation };

/**
 * Validates a code the user is about to create against the household's existing
 * codes (system defaults plus custom codes, inactive ones included). Existence
 * and activity of the parent are checked here; the caller supplies the IO.
 */
export const validateNewLedgerCode = (
  code: string,
  existing: LedgerCodeCandidate[],
): NewLedgerCodeValidation => {
  const shape = parseLedgerCode(code);
  if (!shape) return { valid: false, violation: 'INVALID_SHAPE' };
  if (!KNOWN_LEDGER_TYPES.includes(shape.type)) return { valid: false, violation: 'UNKNOWN_TYPE' };

  if (existing.some((candidate) => candidate.code === code)) {
    return { valid: false, violation: 'DUPLICATE' };
  }

  if (shape.parent) {
    const parent = existing.find((candidate) => candidate.code === shape.parent);
    if (!parent) return { valid: false, violation: 'PARENT_MISSING' };
    if (!parent.isActive) return { valid: false, violation: 'PARENT_INACTIVE' };
  }

  return { valid: true, type: shape.type, parent: shape.parent };
};

/** Depth-2 codes of a type, used to suggest valid parents in error messages. */
export const depthTwoCodesOfType = (codes: LedgerCodeCandidate[], type: string): string[] =>
  codes
    .filter((candidate) => candidate.type === type && parseLedgerCode(candidate.code)?.depth === 2)
    .map((candidate) => candidate.code);
