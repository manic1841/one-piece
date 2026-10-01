import React from 'react';

import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import { type CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';

interface CloseEvidenceOnlyStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  evidence: CloseStageEvidence;
  /** Set when the stage's own load failed; the stage shows no evidence then. */
  loadErrorMessage?: string | null;
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
  loadErrorMessage = null,
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
    <CloseStageLoadError message={loadErrorMessage} />
  </CloseStageChrome>
);
