import { useCallback, useRef, useState } from 'react';

import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { type AuthContext } from '@/application/types';
import { type useLoadingTask } from '@/ui/hooks/useLoadingTask';

import {
  EMPTY_OPENING,
  type OpeningNetWorthVM,
  type ReportValue,
} from '../viewmodels/workspaceDraft.vm';

interface UseOpeningDraftArgs {
  householdId: string | undefined;
  auth: AuthContext;
  /** Marks the workspace dirty on every user edit (not on the initial seed). */
  markDirty: () => void;
  run: ReturnType<typeof useLoadingTask>['run'];
}

/**
 * The opening net worth draft: which source is selected, the raw amount text and
 * the last report value the user could switch back to. The derived value is
 * seeded once from the latest closed period; after that the user owns it.
 */
export function useOpeningDraft({ householdId, auth, markDirty, run }: UseOpeningDraftArgs) {
  const [opening, setOpening] = useState<OpeningNetWorthVM>(EMPTY_OPENING);
  const [reportValue, setReportValue] = useState<ReportValue | null>(null);

  // Once seeded (by the report or by a preload), the initial load must not
  // overwrite what is already on screen.
  const seededRef = useRef(false);
  const markSeeded = useCallback(() => {
    seededRef.current = true;
  }, []);

  const loadOpening = useCallback(async () => {
    await run(
      async () => {
        if (!householdId) return { reason: 'NO_CLOSED_PERIOD' as const };
        return getProjectionOpeningUseCase.execute({ householdId, auth });
      },
      {
        writeBack: (result) => {
          if (!result.ok || seededRef.current) return;
          seededRef.current = true;

          if ('reason' in result.value) {
            setReportValue(null);
            setOpening(EMPTY_OPENING);
            return;
          }

          const seeded: ReportValue = {
            amountText: String(result.value.openingNetWorth),
            anchorYearMonth: result.value.anchorYearMonth,
          };
          setReportValue(seeded);
          setOpening({ source: 'derived', ...seeded });
        },
      },
    );
  }, [auth, householdId, run]);

  const setOpeningAmount = useCallback(
    (amountText: string) => {
      setOpening((current) => ({ ...current, amountText }));
      markDirty();
    },
    [markDirty],
  );

  const enterManual = useCallback(() => {
    setOpening((current) => ({ ...current, source: 'manual', anchorYearMonth: null }));
    markDirty();
  }, [markDirty]);

  const useReportValue = useCallback(() => {
    if (reportValue === null) return;
    setOpening({ source: 'derived', ...reportValue });
    markDirty();
  }, [markDirty, reportValue]);

  const replace = useCallback((next: OpeningNetWorthVM, nextReportValue: ReportValue | null) => {
    setOpening(next);
    setReportValue(nextReportValue);
  }, []);

  return {
    opening,
    reportValue,
    seededRef,
    markSeeded,
    loadOpening,
    reload: loadOpening,
    replace,
    setOpeningAmount,
    enterManual,
    useReportValue,
  };
}
