/**
 * Shared contract between the resolver and the projection engine (#338).
 * Amounts are always positive; direction lives in `inflows` / `outflows`.
 */
export interface AmountItem {
  sourceRef: string;
  label: string;
  origin: 'rule' | 'event';
  amount: number;
}

export interface ProjectionYearInput {
  year: number;
  inflows: AmountItem[];
  outflows: AmountItem[];
}

export interface ProjectionInput {
  firstYear: number;
  lastYear: number;
  retirementYear: number;
  openingNetWorth: number;
  annualReturnRate: number;
  years: ProjectionYearInput[];
}

export type ProjectionResolveErrorCode =
  | 'CYCLE'
  | 'DANGLING_REFERENCE'
  | 'MISSING_LEDGER_CODE'
  | 'MISSING_DEBT_ACCOUNT'
  | 'MISSING_BASELINE'
  | 'DISABLED_REFERENCE'
  | 'BASELINE_BEHIND'
  | 'BASELINE_AFTER_START'
  | 'DEBT_ENDED_BEFORE_START';

export interface ProjectionResolveError {
  code: ProjectionResolveErrorCode;
  params: Record<string, unknown>;
  severity: 'error' | 'warning';
}

/** Baseline facts persisted in `snapshots/source`; never the entries themselves. */
export interface RuleSourceSnapshot {
  ruleId: string;
  sourceType: 'ledgerCode' | 'rule' | 'debtAccount';
  sourceId: string;
  baselineYear: number;
  baselineAmount: number;
}
