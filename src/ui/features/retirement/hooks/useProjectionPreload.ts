import { useCallback, useEffect, useRef } from 'react';

import { openWorkspaceFromProjection } from '@/application/retirement/workflows/openWorkspaceFromProjection';
import { type AuthContext } from '@/application/types';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { type WorkspaceDraft } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { type useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface PreloadTargets {
  setDirty: (dirty: boolean) => void;
  setWarning: (warning: string | null) => void;
  replaceAll: (draft: WorkspaceDraft) => void;
  markSeeded: () => void;
  clearParams: () => void;
}

interface UseProjectionPreloadArgs extends PreloadTargets {
  householdId: string | undefined;
  /** Route query `?from=`; `null` means there is nothing to preload. */
  fromId: string | null;
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
  fromId,
  auth,
  run,
  setDirty,
  setWarning,
  replaceAll,
  markSeeded,
  clearParams,
}: UseProjectionPreloadArgs) {
  const startedRef = useRef<string | null>(null);

  const preload = useCallback(
    async (projectionId: string) => {
      await run(
        async () => {
          if (!householdId) return null;
          return openWorkspaceFromProjection.execute({ householdId, projectionId, auth });
        },
        {
          writeBack: (result) => {
            if (!result.ok || result.value === null) {
              markSeeded();
              setWarning(PROJECTION_WORKSPACE_LABELS.PRELOAD_FAILED);
              replaceAll({
                assumptions: {
                  birthYear: 0,
                  retirementAge: 0,
                  lifeExpectancy: 0,
                  inflationRate: 0,
                  annualReturnRate: 0,
                },
                rules: [],
                events: [],
                startYear: new Date().getFullYear(),
                opening: { source: 'derived', amountText: '', anchorYearMonth: null },
                reportValue: null,
              });
              setDirty(true);
              clearParams();
              return;
            }

            const { data, derived } = result.value;
            const config = data.config;
            if (config === null) return;

            if (config.openingNetWorth.source === 'manual') {
              replaceAll({
                assumptions: config.assumptions,
                rules: config.projectionRules,
                events: config.lifeEvents,
                startYear: config.startYear,
                opening: {
                  source: 'manual',
                  amountText: String(Math.round(config.openingNetWorth.amount)),
                  anchorYearMonth: null,
                },
                reportValue: null,
              });
            } else if (derived !== null && !('reason' in derived)) {
              const reportValue = {
                amountText: String(Math.round(derived.openingNetWorth)),
                anchorYearMonth: derived.anchorYearMonth,
              };
              replaceAll({
                assumptions: config.assumptions,
                rules: config.projectionRules,
                events: config.lifeEvents,
                startYear: config.startYear,
                opening: { source: 'derived', ...reportValue },
                reportValue,
              });
            } else {
              // The derived opening is re-resolved, never copied from the frozen
              // snapshot. Without a closed period it stays blank and warns.
              replaceAll({
                assumptions: config.assumptions,
                rules: config.projectionRules,
                events: config.lifeEvents,
                startYear: config.startYear,
                opening: { source: 'derived', amountText: '', anchorYearMonth: null },
                reportValue: null,
              });
              setWarning(PROJECTION_WORKSPACE_LABELS.PRELOAD_OPENING_UNRESOLVED);
            }

            markSeeded();
            setDirty(true);
            clearParams();
          },
        },
      );
    },
    [auth, clearParams, householdId, markSeeded, replaceAll, run, setDirty, setWarning],
  );

  useEffect(() => {
    if (fromId === null || startedRef.current === fromId) return;

    // Start after the current task: StrictMode tears the first mount down before
    // its run could settle, and the cleanup below lets the second mount start it.
    startedRef.current = fromId;
    const timer = setTimeout(() => void preload(fromId), 0);
    return () => {
      clearTimeout(timer);
      startedRef.current = null;
    };
  }, [fromId, preload]);
}
