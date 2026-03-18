import { useState } from 'react';

import { type Project, type ProjectSnapshotCreate } from '@/domains/project/schemas';
import { settlementService } from '@/domains/project/settlementService';

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
  const [status, setStatus] = useState<DialogStatusType>(DialogStatus.SELECTION);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [settlements, setSettlements] = useState<
    (ProjectSnapshotCreate & { projectId: string; projectName: string })[]
  >([]);
  const [error, setError] = useState('');

  const toPreview = async () => {
    if (!householdId || !projects || projects.length === 0) {
      setError('No project data found for settlement.');
      return;
    }
    setError('');
    setStatus(DialogStatus.PROCESSING);

    try {
      const previews = await settlementService.calculateAllSettlements(
        householdId,
        projects,
        year,
        month,
      );
      setSettlements(previews);
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
      await settlementService.settleMonth(
        householdId,
        yearMonth,
        userEmail
      );

      setStatus(DialogStatus.DONE);
      setTimeout(() => {
        onSuccess?.();
        close();
      }, 1500);
    } catch (err) {
      console.error('Error creating settlements:', err);
      const message = err instanceof Error ? err.message : 'Failed to create settlements. Please try again.';
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
    toPreview,
    confirm,
    back,
    close,
  };
};
