import { useCallback, useEffect, useRef, useState } from 'react';

import { useBlocker } from 'react-router-dom';

import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type ProjectionWorkspaceStage = 'setup' | 'preview';
export type OpeningNetWorthSource = 'derived' | 'manual';

export interface OpeningNetWorthVM {
  source: OpeningNetWorthSource;
  /** Raw field value; kept as a string at the field boundary. */
  amountText: string;
  /** Only present while the value is derived. */
  anchorYearMonth: string | null;
}

interface ReportValue {
  amountText: string;
  anchorYearMonth: string;
}

const EMPTY_OPENING: OpeningNetWorthVM = {
  source: 'derived',
  amountText: '',
  anchorYearMonth: null,
};

/**
 * Controller for the projection workspace shell. The draft is a single
 * in-memory object; switching stages never changes the route and never drops
 * it. Every edit marks the workspace dirty, and leaving is gated through
 * `useConfirm` for both router navigation and refresh.
 */
export function useProjectionWorkspace(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const { confirm } = useConfirm();
  const {
    loading: openingLoading,
    error: openingError,
    run,
  } = useLoadingTask({
    initiallyLoading: true,
  });

  const [stage, setStage] = useState<ProjectionWorkspaceStage>('setup');
  const [opening, setOpening] = useState<OpeningNetWorthVM>(EMPTY_OPENING);
  const [reportValue, setReportValue] = useState<ReportValue | null>(null);
  const [dirty, setDirty] = useState(false);

  const seededRef = useRef(false);
  const promptingRef = useRef(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const loadOpening = useCallback(async () => {
    await run(
      async () => {
        if (!householdId) return { reason: 'NO_CLOSED_PERIOD' as const };
        return getStartingNetWorthUseCase.execute({ householdId, auth });
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
            amountText: String(result.value.startingNetWorth),
            anchorYearMonth: result.value.anchorYearMonth,
          };
          setReportValue(seeded);
          setOpening({
            source: 'derived',
            amountText: seeded.amountText,
            anchorYearMonth: seeded.anchorYearMonth,
          });
        },
      },
    );
  }, [auth, householdId, run]);

  useEffect(() => {
    void loadOpening();
  }, [loadOpening]);

  // Router blocker: an in-app navigation away from a dirty workspace asks first.
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== 'blocked' || promptingRef.current) return;
    promptingRef.current = true;

    void confirm({
      title: PROJECTION_WORKSPACE_LABELS.LEAVE_TITLE,
      context: PROJECTION_WORKSPACE_LABELS.LEAVE_CONTEXT,
      consequence: PROJECTION_WORKSPACE_LABELS.LEAVE_CONSEQUENCE,
      confirmLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CONFIRM,
      cancelLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CANCEL,
    }).then((confirmed) => {
      promptingRef.current = false;
      if (confirmed) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);

  // Refresh / tab close: the browser dialog has no confirm UI of ours.
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

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

  const useManualValue = enterManual;

  const useReportValue = useCallback(() => {
    if (!reportValue) return;
    setOpening({ source: 'derived', ...reportValue });
    markDirty();
  }, [markDirty, reportValue]);

  const retryOpening = useCallback(() => {
    void loadOpening();
  }, [loadOpening]);

  const goToPreview = useCallback(() => setStage('preview'), []);
  const backToSetup = useCallback(() => setStage('setup'), []);

  return {
    stage,
    opening,
    dirty,
    openingLoading,
    openingError,
    hasClosedPeriod: reportValue !== null,
    canUseReportValue: reportValue !== null,
    setOpeningAmount,
    enterManual,
    useManualValue,
    useReportValue,
    retryOpening,
    goToPreview,
    backToSetup,
  };
}
