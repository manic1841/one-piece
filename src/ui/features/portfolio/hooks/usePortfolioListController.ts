import { useCallback, useEffect, useMemo, useState } from 'react';

import { PORTFOLIO_PAGE_LABELS } from '@/ui/constants/portfolio/labels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type PortfolioListRowVM,
  mapPortfolioToRowVM,
  mapPortfoliosToOverviewVM,
} from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';
import {
  type Account,
  type PortfolioFormVM,
  mapPortfolioVMToDomain,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

const byOrder = (a: { order?: number }, b: { order?: number }): number =>
  (a.order || 0) - (b.order || 0);

/**
 * Owns the portfolio list's data: the rows, the drag order, the create dialog
 * and the account options. The page keeps only rendering (ui-layer-architecture
 * §4 Presentation State Stays Put).
 */
export function usePortfolioListController() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId || '';
  const auth = useAuthIdentity();

  const { portfolios, latestSnapshots, loading, errorMessage, reload } = usePortfolios(householdId);
  const { fetchAccounts } = useAccounts();
  const { createPortfolio, reorderPortfolios } = usePortfolioCmds(
    householdId,
    auth.email || '',
    reload,
  );

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [localRows, setLocalRows] = useState<PortfolioListRowVM[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    // Written back through the task mechanism, not after `await` (§4).
    void fetchAccounts(householdId, auth, {
      includeInactive: true,
      writeBack: setAccounts,
    });
  }, [householdId, auth, fetchAccounts]);

  const accountNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const account of accounts) {
      names.set(account.id, account.name);
    }
    return names;
  }, [accounts]);

  const baseRows = useMemo<PortfolioListRowVM[]>(
    () =>
      [...portfolios]
        .sort(byOrder)
        .map((portfolio) =>
          mapPortfolioToRowVM(portfolio, latestSnapshots.get(portfolio.id), accountNames),
        ),
    [portfolios, latestSnapshots, accountNames],
  );

  const baseIds = useMemo(() => new Set(baseRows.map((row) => row.id)), [baseRows]);
  const rows =
    localRows.length === baseRows.length && baseRows.every((row) => baseIds.has(row.id))
      ? localRows
      : baseRows;

  const overview = useMemo(
    () => mapPortfoliosToOverviewVM(portfolios, latestSnapshots),
    [portfolios, latestSnapshots],
  );

  const reorderRows = useCallback(
    (ordered: PortfolioListRowVM[]) => {
      setLocalRows(ordered);
      void reorderPortfolios(ordered.map((row, index) => ({ id: row.id, order: index }))).then(() =>
        reload(),
      );
    },
    [reorderPortfolios, reload],
  );

  const create = useCallback(
    async (vm: PortfolioFormVM) => {
      await createPortfolio(mapPortfolioVMToDomain(vm));
    },
    [createPortfolio],
  );

  const openForm = useCallback(() => setIsFormOpen(true), []);
  const closeForm = useCallback(() => setIsFormOpen(false), []);

  return {
    loading,
    // The mechanism carries the failure value; the user-facing copy is the
    // consumer's (§4 Error Wording Stays With The Consumer).
    error: errorMessage === null ? null : PORTFOLIO_PAGE_LABELS.LOAD_ERROR,
    reload,
    rows,
    overview,
    accounts,
    reorderRows,
    create,
    isFormOpen,
    openForm,
    closeForm,
  };
}
