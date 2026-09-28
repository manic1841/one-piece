import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

interface UseFinancialReportsStageArgs {
  householdId: string;
  confirmingStageId: string | null;
}

/**
 * Stage controller for FINANCIAL_REPORTS: owns the report label resolver
 * (absorbed from useReportLabelResolver) — the static catalog resolves first
 * and household custom codes override it, so persisted reports carry directly
 * displayable labels for user-defined ledger codes. The resolver rides the
 * confirm payload; there is no draft state and no gate.
 */
export const useFinancialReportsStage = ({
  householdId,
  confirmingStageId,
}: UseFinancialReportsStageArgs): CloseStageControl & {
  labelResolver: ReportLabelResolver;
} => {
  const auth = useAuthIdentity();
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    const loadCustomLabels = async () => {
      try {
        const entries = await listAllLedgerCodesUseCase.execute({
          householdId,
          auth,
          labelResolver: getUnifiedLedgerCodeLabel,
        });
        if (cancelled) return;
        setCustomLabels(
          new Map(
            entries.filter((entry) => entry.isCustom).map((entry) => [entry.code, entry.label]),
          ),
        );
      } catch (caught) {
        console.error('Error loading report label resolver:', caught);
      }
    };

    void loadCustomLabels();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId]);

  const labelResolver = useCallback(
    (code: string, fallback?: string) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code,
    [customLabels],
  );

  const control = useConfirmStageControl({
    stageId: 'FINANCIAL_REPORTS',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'FINANCIAL_REPORTS', labelResolver }),
    // The report preview stays open so the user can read the generated
    // reports before confirming the next stage; every other stage resets.
    keepsViewOnConfirm: true,
  });

  return { ...control, labelResolver };
};
