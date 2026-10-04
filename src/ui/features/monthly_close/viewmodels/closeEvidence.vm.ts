import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';

/** Stage evidence: the system's inference about one close stage's state (CONTEXT.md: 證據). */

export interface ProjectSettlementEvidenceRow {
  projectId: string;
  projectName: string;
  /** Whether the month's snapshot is already persisted. */
  settled: boolean;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}

export type CloseStageEvidence =
  | { kind: 'ZERO_ACTIVITY'; names: string[] }
  | { kind: 'ADJUSTMENT'; count: number }
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
  count,
});

export const persistenceEvidence = (persisted: boolean): CloseStageEvidence => ({
  kind: 'PERSISTENCE',
  persisted,
});

export const settlementsEvidence = (rows: ProjectSettlementEvidenceRow[]): CloseStageEvidence => ({
  kind: 'SETTLEMENTS',
  rows,
});
