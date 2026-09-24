import { type PreviewDebtSettlementsResult } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type AuthContext } from '@/application/types';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';

import { type SettlementReadiness, getSettlementReadinessUseCase } from './getSettlementReadinessUseCase';
import {
  type PreviewFinancialReportsResult,
  previewFinancialReportsWorkflow,
} from './previewFinancialReportsWorkflow';

export interface GetSettlementStatusRequest {
  householdId: string;
  auth: AuthContext;
  year: number;
  month: number;
  /** Supplied by the presentation layer so report labels read the same as elsewhere. */
  labelResolver?: ReportLabelResolver;
}

export interface SettlementStatus {
  year: number;
  month: number;
  debtPreview: PreviewDebtSettlementsResult;
  readiness: SettlementReadiness;
  /** `null` until every entity for the month is settled — see `execute`. */
  reports: PreviewFinancialReportsResult | null;
}

/**
 * Everything the settlement surface needs for one month, in one read.
 *
 * This exists as a workflow because the surface needs a *sequence*: the debt
 * preview and the readiness check run first, and the (expensive) financial
 * report preview only runs if readiness says the month can be settled at all.
 * Sequencing that in a hook would make the hook orchestrate use cases, which is
 * the application layer's job.
 */
export class GetSettlementStatusWorkflow {
  async execute(request: GetSettlementStatusRequest): Promise<SettlementStatus> {
    const { householdId, auth, year, month, labelResolver } = request;

    const debtPreview = await previewDebtSettlementsUseCase.execute({
      householdId,
      year,
      month,
      auth,
    });

    const readiness = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    // Gate, not an optimization: an unsettled month has no settled figures to
    // preview, so computing one would only produce numbers the surface must
    // then refuse to show.
    const reports = readiness.isReady
      ? await previewFinancialReportsWorkflow.execute({
          householdId,
          auth,
          year,
          month,
          labelResolver,
        })
      : null;

    return { year, month, debtPreview, readiness, reports };
  }
}

export const getSettlementStatusWorkflow = new GetSettlementStatusWorkflow();
