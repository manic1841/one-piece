import { type SettlementPreview } from '@/domains/project/types';
import { type Project } from '@/schemas';
import { settlementService } from '@/services/settlementService';
import { useState } from 'react';

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
  const [settlements, setSettlements] = useState<SettlementPreview[]>([]);
  const [error, setError] = useState('');

  const toPreview = async () => {
    if (!householdId || !projects) return;
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
    if (!householdId || settlements.length === 0 || !userEmail) return;
    setError('');
    setStatus(DialogStatus.PROCESSING);

    try {
      const result = await settlementService.batchCreateSettlement(
        householdId,
        year,
        month,
        settlements,
        userEmail,
      );

      if (result.success) {
        setStatus('done');
        setTimeout(() => {
          onSuccess?.();
          close();
        }, 1500);
      } else {
        setError(result.errors.join('. '));
        setStatus(DialogStatus.PREVIEW);
      }
    } catch (err) {
      console.error('Error creating settlements:', err);
      setError('Failed to create settlements. Please try again.');
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
