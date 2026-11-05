import { useEffect, useState } from 'react';

import {
  type AnalysisRange,
  type FinancialAnalysis,
  getFinancialAnalysisUseCase,
} from '@/application/report/use_cases/getFinancialAnalysisUseCase';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import { buildReportAnalysisVM, buildReportSummaryVM } from '../viewmodels/reportAnalysis.vm';

const LOAD_ERROR = '無法載入分析資料';

export function useFinancialAnalysis(householdId: string, range: AnalysisRange) {
  const auth = useAuthIdentity();
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const { loading, error, run } = useLoadingTask({ initiallyLoading: true });

  useEffect(() => {
    // A newer range must not be overwritten by an in-flight older response.
    const controller = new AbortController();
    void run(() => getFinancialAnalysisUseCase.execute({ householdId, auth, range }), {
      signal: controller.signal,
      writeBack: (result) => setAnalysis(result.ok ? result.value : null),
    });
    return () => controller.abort();
  }, [householdId, auth, range, run, reloadNonce]);

  return {
    analysis,
    summaryVM: analysis ? buildReportSummaryVM(analysis) : null,
    analysisVM: analysis ? buildReportAnalysisVM(analysis) : null,
    loading,
    errorMessage: error === null ? null : LOAD_ERROR,
    reload: () => setReloadNonce((nonce) => nonce + 1),
  };
}
