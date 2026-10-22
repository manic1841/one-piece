import { type ProjectionRule } from '../projectionRules';

interface LedgerEntry {
  ledgerCode: string;
  debit?: number;
  credit?: number;
}

interface TransactionEntries {
  entries: LedgerEntry[];
}

/**
 * Net amount (`credit - debit`, entries are not stored as absolute values) for
 * one ledger code. Returns `undefined` when the year has no entry for the code
 * at all; the caller reports `LEDGER_BASELINE_EMPTY` rather than downgrading to 0.
 */
export function netForLedgerCode(
  transactions: TransactionEntries[],
  ledgerCodeId: string,
): number | undefined {
  let net = 0;
  let found = false;

  for (const transaction of transactions) {
    for (const entry of transaction.entries) {
      if (entry.ledgerCode !== ledgerCodeId) continue;
      net += (entry.credit || 0) - (entry.debit || 0);
      found = true;
    }
  }

  return found ? net : undefined;
}

/**
 * `specificYear` uses its configured year unchanged; every other policy uses
 * the year before the projection starts. A year with no entries is not walked
 * back — it is `LEDGER_BASELINE_EMPTY` for that rule.
 */
export function baselineYearFor(rule: ProjectionRule, startYear: number): number {
  if (rule.baselinePolicy === 'specificYear' && typeof rule.baselineYear === 'number') {
    return rule.baselineYear;
  }
  return startYear - 1;
}
