import { useCallback, useEffect, useState } from 'react';

import {
  type SettlementReadiness,
  getSettlementReadinessUseCase,
} from '@/application/report/use_cases/getSettlementReadinessUseCase';
import {
  type CompletenessActivity,
  checkSettlementCompletenessUseCase,
} from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type AuthContext } from '@/application/types';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseCompletenessCheckStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

interface CompletenessData {
  anomalies: CompletenessActivity[];
  readiness: SettlementReadiness;
}

/**
 * Loads the month's completeness evidence: the zero-activity anomalies (the
 * only NEEDS_REVIEW source) and the settlement readiness Step 7 aggregates. A
 * read failure returns null so the month-keyed state stays unset rather than
 * reporting a clean month we never checked.
 */
const fetchCompleteness = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<CompletenessData | null> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const [completeness, readiness] = await Promise.all([
      checkSettlementCompletenessUseCase.execute({ householdId, year, month, auth }),
      getSettlementReadinessUseCase.execute({ householdId, year, month, auth }),
    ]);
    return { anomalies: completeness.anomalies, readiness };
  } catch (caught) {
    logger.warn('Failed to load completeness evidence', 'useCompletenessCheckStage', { caught });
    return null;
  }
};

/**
 * Stage controller for COMPLETENESS_CHECK: owns the month's anomalies and the
 * settlement readiness Step 7 renders. It is read-only (no draft, no gate); the
 * readiness it owns is also the single source Step 8's Generate gate reads
 * across stages in the registry, so it is loaded exactly once per refresh.
 */
export const useCompletenessCheckStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseCompletenessCheckStageArgs): ReturnType<typeof useConfirmStageControl> & {
  anomalies: CompletenessActivity[];
  readiness: SettlementReadiness | null;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as empty
  // under the current selection, so a month switch never shows the last
  // month's anomalies while the new month loads.
  const [data, setData] = useState<{ yearMonth: string; data: CompletenessData } | null>(null);
  const current = data?.yearMonth === selectedYearMonth ? data.data : null;

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      const result = await fetchCompleteness({ householdId, selectedYearMonth, auth });
      if (cancelled || !result) return;
      setData({ yearMonth: selectedYearMonth, data: result });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const result = await fetchCompleteness({ householdId, selectedYearMonth, auth });
    if (!result) return;
    setData({ yearMonth: selectedYearMonth, data: result });
  }, [auth, householdId, selectedYearMonth]);

  const control = useConfirmStageControl({
    stageId: 'COMPLETENESS_CHECK',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'COMPLETENESS_CHECK' }),
    refresh,
  });

  return {
    ...control,
    anomalies: current?.anomalies ?? [],
    readiness: current?.readiness ?? null,
  };
};
