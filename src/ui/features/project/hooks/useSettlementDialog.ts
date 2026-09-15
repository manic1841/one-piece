import { useState } from 'react';

import { previewProjectSettlementsUseCase } from '@/application/settlement/use_cases/previewProjectSettlementsUseCase';
import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { type Project } from '@/domains/project/schemas';
import {
  type SettlementPreviewItemVM,
  mapSettlementToPreviewVM,
} from '@/ui/features/project/viewmodels/settlementPreview.vm';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

import { useCompletenessGate } from './useCompletenessGate';

export const DialogStatus = {
  SELECTION: 'selection',
  PREVIEW: 'preview',
  PROCESSING: 'processing',
  DONE: 'done',
} as const;

type DialogStatusType = (typeof DialogStatus)[keyof typeof DialogStatus];

export const useSettlementDialog = (
  householdId?: string,
  projects?: Project[],
  userEmail?: string,
  onSuccess?: () => void,
  onClose?: () => void,
) => {
  const currentDate = new Date();
  const auth = useAuthContext();
  const [status, setStatus] = useState<DialogStatusType>(DialogStatus.SELECTION);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [settlements, setSettlements] = useState<SettlementPreviewItemVM[]>([]);
  const [error, setError] = useState('');

  // Completeness soft gate lives in its own hook (one use case per hook);
  // this hook only asks it whether the selection step may advance.
  const gate = useCompletenessGate(householdId, year, month);
  const { pendingAnomalies, completenessError, confirmAnomaly, reset: resetGate, isSettled } = gate;

  const toPreview = async () => {
    if (!householdId || !projects || projects.length === 0) {
      setError('No project data found for settlement.');
      return;
    }
    // Awaiting inside the gate keeps a fast click from outrunning the check.
    if (!(await isSettled())) {
      setError('');
      setStatus(DialogStatus.SELECTION);
      return;
    }
    setError('');
    setStatus(DialogStatus.PROCESSING);

    try {
      const previews = await previewProjectSettlementsUseCase.execute({
        householdId,
        projects,
        year,
        month,
        auth,
      });
      setSettlements(previews.map(mapSettlementToPreviewVM));
      setStatus(DialogStatus.PREVIEW);
    } catch (err) {
      console.error('Error calculating settlements:', err);
      setError('Failed to calculate settlements. Please try again.');
      setStatus(DialogStatus.SELECTION);
    }
  };

  const confirm = async () => {
    if (!householdId) {
      setError('No household selected. Please reload and try again.');
      return;
    }

    if (settlements.length === 0) {
      setError('Please preview settlement before confirming.');
      return;
    }

    if (!userEmail) {
      setError('Unable to identify current user. Please sign in again.');
      return;
    }

    setError('');
    setStatus(DialogStatus.PROCESSING);

    try {
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      await settleProjectsUseCase.execute({
        householdId,
        yearMonth,
        userEmail,
        auth,
      });

      setStatus(DialogStatus.DONE);
      setTimeout(() => {
        onSuccess?.();
        close();
      }, 2000);
    } catch (err) {
      console.error('Error creating settlements:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to create settlements. Please try again.';
      setError(message);
      setStatus(DialogStatus.PREVIEW);
    }
  };

  const back = () => {
    setStatus(DialogStatus.SELECTION);
  };

  const close = () => {
    setStatus(DialogStatus.SELECTION);
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSettlements([]);
    setError('');
    // Reopening starts a fresh session: confirmations clear and the gate re-runs.
    resetGate();
    onClose?.();
  };

  return {
    status,
    year,
    month,
    setYear,
    setMonth,
    settlements,
    error,
    pendingAnomalies,
    completenessError,
    confirmAnomaly,
    toPreview,
    confirm,
    back,
    close,
  };
};
