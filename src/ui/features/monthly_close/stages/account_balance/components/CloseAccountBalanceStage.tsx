import React from 'react';

import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  type Account,
  type AccountBalanceInput,
  type AccountSnapshot,
} from '@/ui/features/monthly_close/viewmodels/accountBalance.vm';
import { type CloseStageEvidence } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';

import { CloseAccountBalanceInputs } from './CloseAccountBalanceInputs';

interface CloseAccountBalanceStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  evidence: CloseStageEvidence;
  /** Canned copy when the snapshot load failed; prefill is a convenience, so it does not block confirm. */
  loadErrorMessage?: string | null;
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  balances: AccountBalanceInput[];
  setBalances: (value: AccountBalanceInput[]) => void;
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
  evidence,
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
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
      </p>
      <CloseStageEvidenceList evidence={evidence} />
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
