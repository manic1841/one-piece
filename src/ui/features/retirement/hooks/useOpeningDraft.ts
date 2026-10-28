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
 * The opening net worth draft: the raw amount text and the snapshot the user
 * could reset back to. The latest closed period seeds the amount once as a
 * default value — there is no separate mode to switch into, typing is enough.
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
          if (!result.ok) return;

          if ('reason' in result.value) {
            if (seededRef.current) return;
            seededRef.current = true;
            setReportValue(null);
            setOpening(EMPTY_OPENING);
            return;
          }

          const seeded: ReportValue = {
            amountText: String(Math.round(result.value.openingNetWorth)),
            anchorYearMonth: result.value.anchorYearMonth,
          };
          // Remember the snapshot even when the user already typed, so USE
          // SNAPSHOT still has something to restore — but never overwrite what
          // is already on screen.
          setReportValue(seeded);
          if (seededRef.current) return;
          seededRef.current = true;
          setOpening({ source: 'derived', ...seeded });
        },
      },
    );
  }, [auth, householdId, run]);

  /** Typing always means the user owns the value: manual source, no anchor. */
  const setOpeningAmount = useCallback(
    (amountText: string) => {
      seededRef.current = true;
      setOpening({ source: 'manual', amountText, anchorYearMonth: null });
      markDirty();
    },
    [markDirty],
  );

  const resetToSnapshot = useCallback(() => {
    if (reportValue === null) return;
    setOpening({ source: 'derived', ...reportValue });
    markDirty();
  }, [markDirty, reportValue]);

  /** Back to the seeded default: the snapshot when there is one, otherwise empty. */
  const resetDraft = useCallback(() => {
    setOpening(reportValue === null ? EMPTY_OPENING : { source: 'derived', ...reportValue });
  }, [reportValue]);

  /**
   * Amounts are whole NT dollars; the field only accepts decimals while it is
   * being typed. Committing rewrites the text but keeps the source, so tabbing
   * out of a seeded value does not turn it into a manual one.
   */
  const commitOpeningAmount = useCallback(() => {
    setOpening((prev) => {
      const amount = Number(prev.amountText);
      if (prev.amountText.trim() === '' || !Number.isFinite(amount)) return prev;
      const rounded = String(Math.round(amount));
      return rounded === prev.amountText ? prev : { ...prev, amountText: rounded };
    });
  }, []);

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
    commitOpeningAmount,
    resetToSnapshot,
    resetDraft,
  };
}
