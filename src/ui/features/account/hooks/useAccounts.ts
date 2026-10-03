import { useCallback, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { type AuthContext } from '@/application/types';
import { type Account, type AccountWithSnapshot } from '@/domains/account/types';
import { type LoadingTaskResult, useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface AccountFetchOptions<T> {
  includeInactive?: boolean;
  /**
   * Receive the fetched list. Passing it here — instead of writing state after
   * `await` — keeps the write in the task mechanism's hands, which is the
   * documented write-back contract (ui-layer-architecture §4). Only the success
   * arm is delivered; failures surface through the returned result and `error`.
   */
  writeBack?: (value: T) => void;
}

/**
 * Account queries for the UI.
 *
 * `loading` is a **first-load gate**, not a task lifetime: once a fetch has
 * settled, a reload is a background refresh and must not blank the caller back
 * to its skeleton (ui-layer-architecture §4, route/boot gates). A failed first
 * fetch opens the gate too — the caller renders its error state, not a spinner.
 */
export function useAccounts() {
  const { error, errorMessage, run } = useLoadingTask();
  const [hasLoaded, setHasLoaded] = useState(false);

  const track = useCallback(
    <T>(
      task: (signal: AbortSignal) => Promise<T>,
      writeBack?: (value: T) => void,
    ): Promise<LoadingTaskResult<T>> =>
      run(task, {
        writeBack: (result) => {
          setHasLoaded(true);
          if (result.ok) writeBack?.(result.value);
        },
      }),
    [run],
  );

  const fetchAccounts = useCallback(
    async (
      householdId: string,
      auth: AuthContext,
      options?: AccountFetchOptions<Account[]>,
    ): Promise<LoadingTaskResult<Account[]>> =>
      track(
        () =>
          getAccountsUseCase.execute({
            householdId,
            auth,
            includeInactive: options?.includeInactive ?? false,
          }),
        options?.writeBack,
      ),
    [track],
  );

  const fetchAccountsWithSnapshots = useCallback(
    async (
      householdId: string,
      auth: AuthContext,
      options?: AccountFetchOptions<AccountWithSnapshot[]>,
    ): Promise<LoadingTaskResult<AccountWithSnapshot[]>> =>
      track(
        () =>
          getAccountsWithSnapshotsUseCase.execute({
            householdId,
            auth,
            includeInactive: options?.includeInactive ?? false,
          }),
        options?.writeBack,
      ),
    [track],
  );

  return {
    fetchAccounts,
    fetchAccountsWithSnapshots,
    loading: !hasLoaded,
    error,
    errorMessage,
  };
}
