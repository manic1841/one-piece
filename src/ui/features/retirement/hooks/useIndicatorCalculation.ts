import { useCallback, useEffect, useRef } from 'react';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { type useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { type WorkspaceDraftController } from '@/ui/features/retirement/hooks/useWorkspaceDraft';
import { type useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';

interface UseIndicatorCalculationArgs {
  drafts: WorkspaceDraftController;
  validateOpening: ReturnType<typeof useWorkspaceValidation>['validateOpening'];
  calculateProjection: ReturnType<typeof useProjectionCmds>['calculate'];
}

/**
 * The preview rail numbers. They are always summed from the draft, so an
 * unparseable rule or event is left out rather than blocking the whole rail;
 * only opening and assumptions can make the refresh fail outright.
 */
export function useIndicatorCalculation({
  drafts,
  validateOpening,
  calculateProjection,
}: UseIndicatorCalculationArgs) {
  const { opening, startYear, validate } = drafts;
  const latestRef = useRef<(() => Promise<ProjectionSummary>) | undefined>(undefined);

  const calculateIndicators = useCallback(async (): Promise<ProjectionSummary> => {
    const gate = validate();
    const openingError = validateOpening();
    if (!gate.assumptions.ok || gate.assumptions.data === undefined || openingError !== undefined) {
      throw new Error(openingError ?? 'invalid');
    }

    const task = await calculateProjection({
      startYear,
      opening: { source: opening.source, amount: Number(opening.amountText) },
      assumptions: gate.assumptions.data,
      rules: gate.rules.data ?? [],
      lifeEvents: gate.events.data ?? [],
    });
    if (!task.ok || !task.value.ok) throw new Error('calculate failed');
    return task.value.calculation.result.summary;
  }, [calculateProjection, opening, startYear, validate, validateOpening]);

  // The indicators hook is created before this one, so it reads through a ref.
  useEffect(() => {
    latestRef.current = calculateIndicators;
  }, [calculateIndicators]);

  const run = useCallback(
    () => latestRef.current?.() ?? Promise.reject(new Error('not ready')),
    [],
  );

  return { run };
}
