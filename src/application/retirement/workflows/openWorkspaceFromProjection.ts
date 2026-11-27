import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type AuthContext } from '@/application/types';

import { balanceSheetsByMonth } from './openingNetWorth';

interface OpenWorkspaceRequest {
  householdId: string;
  projectionId: string;
  auth: AuthContext;
}

/**
 * Everything the workspace needs to open a saved projection. The frozen config
 * is copied as-is — the opening is not re-resolved, so what was saved is what
 * the workspace shows.
 *
 * The one exception is a dangling anchor: when the anchor month's balance sheet
 * was deleted (or lost in a partial restore) the frozen amount has no provenance
 * left, so the opening falls back to the latest closed month. Without any closed
 * month the value stays but drops to `manual`, which keeps it saveable — a
 * derived opening without an anchor fails the schema.
 */
export const openWorkspaceFromProjection = {
  async execute(request: OpenWorkspaceRequest): Promise<ProjectionViewData | null> {
    const { householdId, projectionId, auth } = request;

    const data = await getProjectionViewUseCase.execute({ householdId, projectionId, auth });
    if (data === null || data.config === null) return null;

    const { openingNetWorth } = data.config;
    const anchorYearMonth = openingNetWorth.anchorYearMonth;
    if (openingNetWorth.source !== 'derived' || anchorYearMonth === undefined) return data;

    const reports = await listReportsUseCase.execute({
      householdId,
      auth,
      // `getProjectionViewUseCase` already authorized this household.
      skipPermissionCheck: true,
    });
    const anchorReport = balanceSheetsByMonth(reports).get(anchorYearMonth);
    // Still intact: the frozen amount is copied untouched.
    if (anchorReport !== undefined) return data;

    const fallback = await getProjectionOpeningUseCase.execute({ householdId, auth });
    return {
      ...data,
      config: {
        ...data.config,
        openingNetWorth:
          'reason' in fallback
            ? { amount: openingNetWorth.amount, source: 'manual' }
            : {
                amount: fallback.openingNetWorth,
                source: 'derived',
                anchorYearMonth: fallback.anchorYearMonth,
              },
      },
    };
  },
};
