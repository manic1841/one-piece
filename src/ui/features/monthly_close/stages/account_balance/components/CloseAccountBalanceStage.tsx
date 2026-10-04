import React, { type SetStateAction } from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseSectionHeading } from '@/ui/features/monthly_close/components/CloseSectionHeading';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  type Account,
  type AccountBalanceInput,
  type AccountSnapshot,
} from '@/ui/features/monthly_close/viewmodels/accountBalance.vm';
import { NO_EVIDENCE } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';

import { CloseAccountBalanceInputs } from './CloseAccountBalanceInputs';

interface CloseAccountBalanceStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  /** Canned copy when the snapshot load failed; prefill is a convenience, so it does not block confirm. */
  loadErrorMessage?: string | null;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  /** null = the snapshot draft is unknown; the inputs surface waits for it. */
  balances: AccountBalanceInput[] | null;
  setBalances: (updater: SetStateAction<AccountBalanceInput[] | null>) => void;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

/**
 * ACCOUNT_BALANCE step: the balance input tables rendered inside the shared
 * chrome with the stage evidence above them.
 */
export const CloseAccountBalanceStage: React.FC<CloseAccountBalanceStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  loadErrorMessage = null,
  accounts,
  accountSnapshots,
  balances,
  setBalances,
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
    <CloseStageLoadError message={loadErrorMessage} />
    <div>
      <CloseSectionHeading eyebrow={MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL} className="mb-1" />
      <CloseStageEvidenceList evidence={NO_EVIDENCE} />
    </div>
    <CloseAccountBalanceInputs
      accounts={accounts}
      snapshots={accountSnapshots}
      inputs={balances}
      onInputsChange={setBalances}
      isReadOnly={isReadOnly}
    />
  </CloseStageChrome>
);
