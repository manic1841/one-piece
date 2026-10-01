import { useCallback } from 'react';

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
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseCompletenessCheckStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  enabled?: boolean;
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
 * owns.
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
 * Loading goes through `useStageLoader`, which owns the period-keyed value, the
 * supersede, and the failure shape (a failed month switch reads empty while a
 * failed same-month refresh keeps the last known values, so consumers gate on
 * `errorMessage` — never on the data alone, #226).
 */
export const useCompletenessCheckStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  enabled = true,
}: UseCompletenessCheckStageArgs): ReturnType<typeof useConfirmStageControl> & {
  anomalies: CompletenessActivity[];
  readiness: SettlementReadiness | null;
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchCompleteness({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, refresh } = useStageLoader<CompletenessData>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '',
    load,
  });

  const control = useConfirmStageControl({
    stageId: 'COMPLETENESS_CHECK',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'COMPLETENESS_CHECK' }),
    refresh,
  });

  return {
    ...control,
    anomalies: data?.anomalies ?? [],
    readiness: data?.readiness ?? null,
    errorMessage,
  };
};
