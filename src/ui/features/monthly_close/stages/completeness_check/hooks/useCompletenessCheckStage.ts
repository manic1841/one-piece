import { useCallback, useEffect, useRef, useState } from 'react';

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
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
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

const LOAD_ERROR = '無法載入結算就緒狀態，請稍後再試。';

/**
 * Loads the month's completeness evidence: the zero-activity anomalies (the
 * only NEEDS_REVIEW source) and the settlement readiness Step 7 aggregates. A
 * read failure throws the canned message so the surface shows copy the consumer
 * owns, and the month-keyed state stays unset rather than reporting a clean
 * month we never checked.
 */
const fetchCompleteness = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<CompletenessData> => {
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
    throw new Error(LOAD_ERROR);
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
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as empty
  // under the current selection, so a month switch never shows the last
  // month's anomalies while the new month loads.
  const [data, setData] = useState<{ yearMonth: string; data: CompletenessData } | null>(null);
  const { errorMessage, run } = useLoadingTask();
  // Paging months faster than the check completes supersedes the previous load;
  // without this the slower, older month could land last and win.
  const inFlightRef = useRef<AbortController | null>(null);
  const current = data?.yearMonth === selectedYearMonth ? data.data : null;

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchCompleteness({ householdId, selectedYearMonth, auth }), {
      signal: controller.signal,
      // A failed run writes nothing, so the stage reports a clean month rather
      // than the previous month's; the error channel carries the canned message.
      writeBack: (result) => {
        if (!result.ok) return;
        setData({ yearMonth: selectedYearMonth, data: result.value });
      },
    });
  }, [auth, householdId, run, selectedYearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const control = useConfirmStageControl({
    stageId: 'COMPLETENESS_CHECK',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'COMPLETENESS_CHECK' }),
    refresh: load,
  });

  return {
    ...control,
    anomalies: current?.anomalies ?? [],
    readiness: current?.readiness ?? null,
    errorMessage,
  };
};
