import { useEffect, useMemo, useState } from 'react';

import { getAccountUseCase } from '@/application/account/use_cases/getAccountUseCase';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { calculatePortfolioSnapshot } from '@/domains/portfolio/calculators/portfolioCalculator';
import { toPortfolioSnapshotForm, toPortfolioSnapshotFormData } from '@/domains/portfolio/mappers';
import {
  type Portfolio,
  type PortfolioSnapshot,
  type PortfolioSnapshotFormData,
} from '@/domains/portfolio/types/portfolio';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export const usePortfolioSnapshotForm = (
  householdId: string,
  portfolio: Portfolio,
  onClose: () => void,
  onSubmit: (data: PortfolioSnapshotFormData) => Promise<void>,
) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const initialData = toPortfolioSnapshotForm();
  const [year, setYear] = useState(initialData.year);
  const [month, setMonth] = useState(initialData.month);
  const [deposits, setDeposits] = useState(initialData.deposits.toString());
  const [withdrawals, setWithdrawals] = useState(initialData.withdrawals.toString());

  const { loading, error: taskError, run } = useLoadingTask();
  const [submitError, setSubmitError] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<Map<string, AccountSnapshot>>(new Map());
  const [prevSnapshot, setPrevSnapshot] = useState<PortfolioSnapshot | null>(null);

  // Initial load of account definitions
  useEffect(() => {
    let ignore = false;
    const fetchAccounts = async () => {
      await run(async () => {
        const loadedAccounts: Account[] = [];
        for (const accountId of portfolio.accountIds) {
          const account = await getAccountUseCase.execute({ householdId, accountId, auth });
          if (account) loadedAccounts.push(account);
        }
        if (!ignore) setAccounts(loadedAccounts);
      });
    };
    fetchAccounts();
    return () => {
      ignore = true;
    };
  }, [householdId, portfolio.accountIds, run, auth]);

  // Load snapshots whenever year/month or accounts list changes
  useEffect(() => {
    let ignore = false;
    const fetchSnapshots = async () => {
      if (accounts.length === 0) return;

      await run(async () => {
        // We use GetAccountsWithSnapshotsUseCase but filter for specific accounts if needed.
        // Actually, the original implementation fetched specifically for the accounts in the portfolio.
        // Let's use getAccountsWithSnapshotsUseCase but maybe it's easier to iterate if it doesn't support batch ID filtering yet.
        // Wait, getAccountsWithSnapshotsUseCase has an optional accountId.
        // Let's just loop for now or update the use case.

        const snapshotMap = new Map<string, AccountSnapshot>();
        for (const account of accounts) {
          const data = await getAccountsWithSnapshotsUseCase.execute({
            householdId,
            auth,
            accountId: account.id,
          });
          if (data.length > 0 && data[0].snapshot) {
            snapshotMap.set(account.id, data[0].snapshot);
          }
        }

        if (!ignore) {
          setAccountSnapshots(snapshotMap);
        }
      });
    };
    fetchSnapshots();
    return () => {
      ignore = true;
    };
  }, [householdId, accounts, year, month, run, auth]);

  // Fetch previous snapshot for performance calculation
  useEffect(() => {
    let ignore = false;
    const fetchPrevSnapshot = async () => {
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      const snapshots = await listPortfolioSnapshotsUseCase.execute({
        householdId,
        portfolioId: portfolio.id,
        year: prevYear,
        month: prevMonth,
        auth,
      });
      if (!ignore) {
        setPrevSnapshot(snapshots.length > 0 ? snapshots[0] : null);
      }
    };
    fetchPrevSnapshot();
    return () => {
      ignore = true;
    };
  }, [householdId, portfolio.id, year, month, auth]);

  // Calculate preview data
  const preview = useMemo(() => {
    const inputMap = new Map<string, AccountSnapshot | null>();
    accounts.forEach((a) => {
      inputMap.set(a.id, accountSnapshots.get(a.id) || null);
    });

    return calculatePortfolioSnapshot({
      year,
      month,
      portfolioId: portfolio.id,
      accounts,
      accountSnapshots: inputMap,
      prevSnapshot,
      cashFlow: {
        deposits: parseFloat(deposits) || 0,
        withdrawals: parseFloat(withdrawals) || 0,
      },
    });
  }, [year, month, portfolio.id, accounts, accountSnapshots, prevSnapshot, deposits, withdrawals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    await run(async () => {
      try {
        await onSubmit(toPortfolioSnapshotFormData(year, month, deposits, withdrawals));
        onClose();
      } catch (err) {
        setSubmitError((err as Error).message || 'Failed to create snapshot');
      }
    });
  };

  const isMissingSnapshots = accounts.some((a) => !accountSnapshots.has(a.id));

  return {
    year,
    setYear,
    month,
    setMonth,
    deposits,
    setDeposits,
    withdrawals,
    setWithdrawals,
    loading,
    error: submitError || (taskError ? 'Error loading data' : ''),
    accounts,
    accountSnapshots,
    totalValue: preview.totalValue,
    preview,
    handleSubmit,
    isMissingSnapshots,
  };
};
