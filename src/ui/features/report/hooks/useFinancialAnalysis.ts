import { useEffect, useState } from 'react';

import {
  type AnalysisRange,
  type FinancialAnalysis,
  getFinancialAnalysisWorkflow,
} from '@/application/report/use_cases/getFinancialAnalysisWorkflow';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import {
  type AnalysisGranularity,
  buildReportAnalysisVM,
  buildReportSummaryVM,
} from '../viewmodels/reportAnalysis.vm';

export function useFinancialAnalysis(
  householdId: string,
  range: AnalysisRange,
  granularity: AnalysisGranularity,
  selectedPeriod: string | null,
) {
  const auth = useAuthIdentity();
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  useEffect(() => {
    // A newer range must not be overwritten by an in-flight older response.
    const controller = new AbortController();
    void run(() => getFinancialAnalysisWorkflow.execute({ householdId, auth, range }), {
      signal: controller.signal,
      writeBack: (result) => setAnalysis(result.ok ? result.value : null),
    });
    return () => controller.abort();
  }, [householdId, auth, range, run, reloadNonce]);

  return {
    analysis,
    summaryVM: analysis ? buildReportSummaryVM(analysis) : null,
    analysisVM: analysis ? buildReportAnalysisVM(analysis, granularity, selectedPeriod) : null,
    loading,
    errorMessage: error === null ? null : REPORT_ANALYSIS_LABELS.LOAD_ERROR,
    reload: () => setReloadNonce((nonce) => nonce + 1),
  };
}
