import { useCallback, useEffect, useRef } from 'react';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { type useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { type useWorkspaceDrafts } from '@/ui/features/retirement/hooks/useWorkspaceDrafts';
import { type useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';

interface UseIndicatorCalculationArgs {
  drafts: ReturnType<typeof useWorkspaceDrafts>;
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
  const { assumptions, rules, events, opening, startYear } = drafts;
  const latestRef = useRef<(() => Promise<ProjectionSummary>) | undefined>(undefined);

  const calculateIndicators = useCallback(async (): Promise<ProjectionSummary> => {
    const assumptionsResult = assumptions.validate();
    const openingError = validateOpening();
    if (
      !assumptionsResult.ok ||
      assumptionsResult.data === undefined ||
      openingError !== undefined
    ) {
      throw new Error(openingError ?? 'invalid');
    }

    const ruleResult = rules.validate();
    const eventResult = events.validate();

    const task = await calculateProjection({
      startYear,
      opening: { source: opening.source, amount: Number(opening.amountText) },
      assumptions: assumptionsResult.data,
      rules: ruleResult.data ?? [],
      lifeEvents: eventResult.data ?? [],
    });
    if (!task.ok || !task.value.ok) throw new Error('calculate failed');
    return task.value.calculation.result.summary;
  }, [assumptions, calculateProjection, events, opening, rules, startYear, validateOpening]);

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
