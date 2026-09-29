import { useCallback, useEffect, useState } from 'react';

import {
  type StoredReportsBundle,
  getStoredReportsBundleUseCase,
} from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import {
  type PreviewFinancialReportsResult,
  previewFinancialReportsWorkflow,
} from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type AuthContext } from '@/application/types';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useNoOpStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseClosePeriodStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

/**
 * Loads the month's live report preview. Returns null on failure so the
 * month-keyed state stays unset (which reads as null) instead of showing a
 * stale bundle or claiming there are no figures.
 */
const fetchReportBundle = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<PreviewFinancialReportsResult | null> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    return await previewFinancialReportsWorkflow.execute({ householdId, auth, year, month });
  } catch (caught) {
    logger.warn('Failed to preview financial reports', 'useClosePeriodStage', { caught });
    return null;
  }
};

/**
 * Loads the month's persisted reports (the frozen record drift compares
 * against). Returns null on failure so the caller leaves the month-keyed state
 * unset rather than treating a read failure as "no persisted report".
 */
const fetchPersistedBundle = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<StoredReportsBundle | null> => {
  try {
    return await getStoredReportsBundleUseCase.execute({
      householdId,
      yearMonth: selectedYearMonth,
      auth,
    });
  } catch (caught) {
    logger.warn('Failed to load persisted reports', 'useClosePeriodStage', { caught });
    return null;
  }
};

/**
 * Stage controller for CLOSE_PERIOD: owns the month's report preview bundle —
 * the live, always-recomputed figures Step 9 renders — and the month's
 * persisted report bundle, the frozen record Step 9 and Step 8 compare the
 * preview against (Report Drift). The preview is loaded unconditionally, not
 * gated on persisted reports: the close summary always reflects the current
 * entries, and persistence is only a flag owned by FINANCIAL_REPORTS. `refresh`
 * reloads both when the period changes under the stage; there is no draft and
 * no gate.
 */
export const useClosePeriodStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseClosePeriodStageArgs): CloseStageControl & {
  reportBundle: PreviewFinancialReportsResult | null;
  persistedBundle: StoredReportsBundle | null;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as null
  // under the current selection, so a month switch never shows the last
  // month's figures while the new month loads.
  const [bundle, setBundle] = useState<{
    yearMonth: string;
    data: PreviewFinancialReportsResult;
  } | null>(null);
  const reportBundle = bundle?.yearMonth === selectedYearMonth ? bundle.data : null;

  const [persisted, setPersisted] = useState<{
    yearMonth: string;
    data: StoredReportsBundle;
  } | null>(null);
  const persistedBundle = persisted?.yearMonth === selectedYearMonth ? persisted.data : null;

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      const [data, stored] = await Promise.all([
        fetchReportBundle({ householdId, selectedYearMonth, auth }),
        fetchPersistedBundle({ householdId, selectedYearMonth, auth }),
      ]);
      if (cancelled) return;
      if (data) setBundle({ yearMonth: selectedYearMonth, data });
      if (stored) setPersisted({ yearMonth: selectedYearMonth, data: stored });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const [data, stored] = await Promise.all([
      fetchReportBundle({ householdId, selectedYearMonth, auth }),
      fetchPersistedBundle({ householdId, selectedYearMonth, auth }),
    ]);
    if (data) setBundle({ yearMonth: selectedYearMonth, data });
    if (stored) setPersisted({ yearMonth: selectedYearMonth, data: stored });
  }, [auth, householdId, selectedYearMonth]);

  const control = useNoOpStageControl('CLOSE_PERIOD', confirmingStageId);

  return { ...control, reportBundle, persistedBundle, refresh };
};
