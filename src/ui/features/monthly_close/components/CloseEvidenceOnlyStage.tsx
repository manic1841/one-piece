import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { type CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';

interface CloseEvidenceOnlyStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  evidence: CloseStageEvidence;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

/**
 * TRANSACTION_VALIDATION and PROJECT_SETTLEMENT: workspace stages with no
 * inputs; they render the stage evidence alone inside the shared chrome.
 */
export const CloseEvidenceOnlyStage: React.FC<CloseEvidenceOnlyStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  evidence,
  onConfirm,
  onBackToCurrent,
}) => (
  <CloseStageChrome
    stepText={stepText}
    progressText={progressText}
    confirmedAtText={confirmedAtText}
    confirming={confirming}
    isReviewing={isReviewing}
    isConfirmable={isConfirmable}
    isReadOnly={isReadOnly}
    showActions
    onConfirm={onConfirm}
    onBackToCurrent={onBackToCurrent}
  >
    <CloseStageEvidenceList evidence={evidence} />
    {evidence.kind === 'NONE' && (
      <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>
    )}
  </CloseStageChrome>
);
