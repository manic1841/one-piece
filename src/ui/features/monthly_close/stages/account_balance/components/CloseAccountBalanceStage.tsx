import React, { type SetStateAction } from 'react';

import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import {
  type Account,
  type AccountBalanceInput,
  type AccountSnapshot,
} from '@/ui/features/monthly_close/viewmodels/accountBalance.vm';

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
    <CloseAccountBalanceInputs
      accounts={accounts}
      snapshots={accountSnapshots}
      inputs={balances}
      onInputsChange={setBalances}
      isReadOnly={isReadOnly}
    />
  </CloseStageChrome>
);
