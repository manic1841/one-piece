import { useEffect, useState } from 'react';

import {
  type ReportSummary,
  getReportSummaryWorkflow,
} from '@/application/report/use_cases/getReportSummaryWorkflow';
import { REPORT_SUMMARY_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { buildReportSummaryVM } from '../viewmodels/reportSummary.vm';

/** The landing page's four KPIs only, without the rest of the analysis series. */
export function useReportSummary(householdId: string) {
  const auth = useAuthIdentity();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  useEffect(() => {
    const controller = new AbortController();
    void run(() => getReportSummaryWorkflow.execute({ householdId, auth }), {
      signal: controller.signal,
      writeBack: (result) => setSummary(result.ok ? result.value : null),
    });
    return () => controller.abort();
  }, [householdId, auth, run, reloadNonce]);

  return {
    summaryVM: summary === null ? null : buildReportSummaryVM(summary),
    loading,
    errorMessage: error === null ? null : REPORT_SUMMARY_LABELS.LOAD_ERROR,
    reload: () => setReloadNonce((nonce) => nonce + 1),
  };
}
