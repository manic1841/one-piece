import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import {
  PORTFOLIO_DANGER_LABELS,
  PORTFOLIO_DETAIL_LABELS,
  PORTFOLIO_LIFECYCLE_LABELS,
} from '@/ui/constants/portfolio/labels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolioQueries, usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type PortfolioDetailVM,
  type PortfolioSnapshot,
  mapPortfolioToDetailVM,
} from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Owns PortfolioDetailPage's data: the portfolio row, its snapshots and the linked
 * account names, projected into a single detail VM, plus the rename / lifecycle /
 * delete commands. The page keeps only rendering (see #262 Q12).
 */
export const usePortfolioDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const auth = useAuthIdentity();
  const { confirm } = useConfirm();
  const { fetchAccounts } = useAccounts();
  const {
    portfolios,
    loading: portfoliosLoading,
    errorMessage: portfoliosErrorMessage,
    reload: reloadPortfolios,
  } = usePortfolios(householdId);
  const {
    getSnapshots,
    loading: snapshotsLoading,
    errorMessage: snapshotsErrorMessage,
  } = usePortfolioQueries(householdId);
  const { updatePortfolio, deletePortfolio } = usePortfolioCmds(
    householdId,
    userProfile?.email ?? '',
    reloadPortfolios,
  );

  const portfolio = useMemo(() => portfolios.find((item) => item.id === id), [portfolios, id]);

  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map());
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    // Nothing to fetch without a row; the write-back goes through the task
    // mechanism, not after `await` (§4 Write-Back Through `writeBack`).
    if (portfolio) {
      void getSnapshots(portfolio.id, { writeBack: setSnapshots });
    }
  }, [portfolio, getSnapshots, reloadNonce]);

  useEffect(() => {
    // Written back through the task mechanism so a failed fetch keeps the last
    // good names instead of blanking them (§4 Write-Back Through `writeBack`).
    void fetchAccounts(householdId, auth, {
      includeInactive: true,
      writeBack: (accounts) => {
        const names = new Map<string, string>();
        for (const account of accounts) {
          names.set(account.id, account.name);
        }
        setAccountNames(names);
      },
    });
  }, [householdId, auth, fetchAccounts, reloadNonce]);

  const vm = useMemo<PortfolioDetailVM | null>(
    () => (portfolio ? mapPortfolioToDetailVM(portfolio, snapshots, accountNames) : null),
    [portfolio, snapshots, accountNames],
  );

  const loading = portfoliosLoading || (portfolio !== undefined && snapshotsLoading);

  const errorMessage = portfoliosErrorMessage ?? snapshotsErrorMessage;

  const reload = useCallback(() => {
    void reloadPortfolios();
    setReloadNonce((nonce) => nonce + 1);
  }, [reloadPortfolios]);

  const handleRename = useCallback(
    async (name: string) => {
      if (!portfolio) return;
      await updatePortfolio(portfolio.id, { name });
    },
    [portfolio, updatePortfolio],
  );

  const handleActivate = useCallback(async () => {
    if (!portfolio) return;
    await updatePortfolio(portfolio.id, { isActive: true });
  }, [portfolio, updatePortfolio]);

  const handleDeactivate = useCallback(async () => {
    if (!portfolio) return;
    const confirmed = await confirm({
      title: PORTFOLIO_LIFECYCLE_LABELS.DEACTIVATE_TITLE,
      context: PORTFOLIO_LIFECYCLE_LABELS.DEACTIVATE_CONTEXT,
      consequence: PORTFOLIO_LIFECYCLE_LABELS.DEACTIVATE_CONSEQUENCE,
      confirmLabel: PORTFOLIO_LIFECYCLE_LABELS.DEACTIVATE,
    });
    if (!confirmed) return;
    await updatePortfolio(portfolio.id, { isActive: false });
  }, [portfolio, confirm, updatePortfolio]);

  const handleDelete = useCallback(async () => {
    if (!portfolio) return;
    const confirmed = await confirm({
      title: PORTFOLIO_DANGER_LABELS.DELETE_TITLE,
      consequence: PORTFOLIO_DANGER_LABELS.DELETE_DESCRIPTION,
      confirmLabel: PORTFOLIO_DANGER_LABELS.CONFIRM,
    });
    if (!confirmed) return;
    await deletePortfolio(portfolio.id);
    navigate('/portfolios');
  }, [portfolio, confirm, deletePortfolio, navigate]);

  return {
    vm,
    loading,
    // The mechanism carries the failure value; this hook maps the copy (§4).
    error: errorMessage === null ? null : PORTFOLIO_DETAIL_LABELS.LOAD_ERROR,
    reload,
    handleRename,
    handleActivate,
    handleDeactivate,
    handleDelete,
  };
};

export type PortfolioDetailPageController = ReturnType<typeof usePortfolioDetailPage>;
