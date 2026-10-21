import { useCallback } from 'react';

import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { type useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface PreloadOpening {
  source: 'derived' | 'manual';
  amountText: string;
  anchorYearMonth: string | null;
}

interface PreloadTargets {
  setDirty: (dirty: boolean) => void;
  setWarning: (warning: string | null) => void;
  setOpening: (opening: PreloadOpening) => void;
  setReportValue: (value: { amountText: string; anchorYearMonth: string } | null) => void;
  setStartYear: (year: number) => void;
  resetAssumptions: (assumptions: RetirementAssumptions) => void;
  replaceRules: (rules: ProjectionRule[]) => void;
  replaceEvents: (events: LifeEvent[]) => void;
  markSeeded: () => void;
  clearParams: () => void;
}

interface UseProjectionPreloadArgs extends PreloadTargets {
  householdId: string | undefined;
  auth: AuthContext;
  run: ReturnType<typeof useLoadingTask>['run'];
}

/**
 * Loads a saved projection into the workspace when the route carries `?from=`.
 * A missing source leaves the opening blank and warns; a derived opening is
 * re-resolved against the live ledger instead of copying the stored value.
 */
export function useProjectionPreload({
  householdId,
  auth,
  run,
  setDirty,
  setWarning,
  setOpening,
  setReportValue,
  setStartYear,
  resetAssumptions,
  replaceRules,
  replaceEvents,
  markSeeded,
  clearParams,
}: UseProjectionPreloadArgs) {
  return useCallback(
    async (projectionId: string) => {
      await run(
        async () => {
          if (!householdId) return null;
          const data = await getProjectionViewUseCase.execute({
            householdId,
            projectionId,
            auth,
          });
          if (data === null || data.config === null) return null;

          const derived =
            data.config.openingNetWorth.source === 'derived'
              ? await getStartingNetWorthUseCase.execute({ householdId, auth })
              : null;

          return { data, derived };
        },
        {
          writeBack: (result) => {
            if (!result.ok || result.value === null) {
              markSeeded();
              setWarning(PROJECTION_WORKSPACE_LABELS.PRELOAD_FAILED);
              setOpening({ source: 'derived', amountText: '', anchorYearMonth: null });
              setDirty(true);
              clearParams();
              return;
            }

            const { data, derived } = result.value;
            const config = data.config;
            if (config === null) return;

            resetAssumptions(config.assumptions);
            replaceRules(config.projectionRules);
            replaceEvents(config.lifeEvents);
            setStartYear(config.startYear);

            if (config.openingNetWorth.source === 'manual') {
              setOpening({
                source: 'manual',
                amountText: String(config.openingNetWorth.amount),
                anchorYearMonth: null,
              });
            } else if (derived !== null && !('reason' in derived)) {
              const reportValue = {
                amountText: String(derived.startingNetWorth),
                anchorYearMonth: derived.anchorYearMonth,
              };
              setReportValue(reportValue);
              setOpening({ source: 'derived', ...reportValue });
            } else {
              setOpening({
                source: 'derived',
                amountText: String(config.openingNetWorth.amount),
                anchorYearMonth: config.openingNetWorth.anchorYearMonth ?? null,
              });
            }

            markSeeded();
            setDirty(true);
            clearParams();
          },
        },
      );
    },
    [
      auth,
      clearParams,
      householdId,
      markSeeded,
      replaceEvents,
      replaceRules,
      resetAssumptions,
      run,
      setDirty,
      setOpening,
      setReportValue,
      setStartYear,
      setWarning,
    ],
  );
}
