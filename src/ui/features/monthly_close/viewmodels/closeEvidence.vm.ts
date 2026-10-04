import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { formatCurrency } from '@/ui/utils';

/** Stage evidence: the system's inference about one close stage's state (CONTEXT.md: 證據). */

export interface ProjectSettlementEvidenceRow {
  projectId: string;
  projectName: string;
  /** Whether the month's snapshot is already persisted. */
  settled: boolean;
  /* The four live preview figures, formatted where the VM is built. */
  openingBalanceText: string;
  incomeText: string;
  expenseText: string;
  closingBalanceText: string;
}

export type CloseStageEvidence =
  | { kind: 'ZERO_ACTIVITY'; names: string[] }
  | { kind: 'ADJUSTMENT'; countText: string }
  | { kind: 'PERSISTENCE'; persisted: boolean }
  | { kind: 'SETTLEMENTS'; rows: ProjectSettlementEvidenceRow[] }
  | { kind: 'NONE' };

/** The one kind of evidence a stage with no findings can carry. */
export type NoEvidence = Extract<CloseStageEvidence, { kind: 'NONE' }>;

/** The empty evidence a stage with nothing to report carries. */
export const NO_EVIDENCE: NoEvidence = { kind: 'NONE' };

export const zeroActivityEvidence = (anomalies: CompletenessActivity[]): CloseStageEvidence => ({
  kind: 'ZERO_ACTIVITY',
  names: anomalies.map((activity) => activity.name),
});

export const adjustmentEvidence = (count: number): CloseStageEvidence => ({
  kind: 'ADJUSTMENT',
  countText: count.toLocaleString(),
});

export const persistenceEvidence = (persisted: boolean): CloseStageEvidence => ({
  kind: 'PERSISTENCE',
  persisted,
});

export const settlementsEvidence = (rows: ProjectSettlementEvidenceRow[]): CloseStageEvidence => ({
  kind: 'SETTLEMENTS',
  rows,
});

/** One project's settlement evidence: the preview's four figures, formatted once. */
export const projectSettlementEvidenceRow = ({
  projectId,
  projectName,
  settled,
  openingBalance,
  income,
  expense,
  closingBalance,
}: {
  projectId: string;
  projectName: string;
  settled: boolean;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}): ProjectSettlementEvidenceRow => ({
  projectId,
  projectName,
  settled,
  openingBalanceText: formatCurrency(openingBalance),
  incomeText: formatCurrency(income),
  expenseText: formatCurrency(expense),
  closingBalanceText: formatCurrency(closingBalance),
});
