import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Report display labels: the static catalog resolves first and household
 * custom codes override it, so persisted reports carry directly displayable
 * labels for user-defined ledger codes.
 */
export const useReportLabelResolver = (householdId: string): ReportLabelResolver => {
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

  return useCallback(
    (code: string, fallback?: string) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code,
    [customLabels],
  );
};
