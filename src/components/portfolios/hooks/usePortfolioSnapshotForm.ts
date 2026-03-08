import { useEffect, useMemo, useState } from 'react';

import { calculatePortfolioSnapshot } from '@/domains/finance/calculators/portfolioCalculator';
import { toPortfolioSnapshotForm, toPortfolioSnapshotFormData } from '@/domains/portfolio/mappers';
import {
  type Portfolio,
  type PortfolioSnapshot,
  type PortfolioSnapshotFormData,
} from '@/domains/portfolio/types';
import { useLoadingTask } from '@/hooks/useLoadingTask';
import { type Account, type AccountSnapshot } from '@/schemas';
import { accountService } from '@/services/accountService';
import { portfolioService } from '@/services/portfolioService';

export const usePortfolioSnapshotForm = (
  householdId: string,
  portfolio: Portfolio,
  onClose: () => void,
  onSubmit: (data: PortfolioSnapshotFormData) => Promise<void>,
) => {
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
          const account = await accountService.getAccount(householdId, accountId);
          if (account) loadedAccounts.push(account);
        }
        if (!ignore) setAccounts(loadedAccounts);
      });
    };
    fetchAccounts();
    return () => {
      ignore = true;
    };
  }, [householdId, portfolio.accountIds, run]);

  // Load snapshots whenever year/month or accounts list changes
  useEffect(() => {
    let ignore = false;
    const fetchSnapshots = async () => {
      if (accounts.length === 0) return;

      await run(async () => {
        const withSnapshots = await accountService.getAccountWithSnapshots(
          householdId,
          accounts.map((a) => a.id),
          year,
          month,
        );

        if (!ignore) {
          const snapshotMap = new Map<string, AccountSnapshot>();
          withSnapshots.forEach((item) => {
            if (item.snapshot) {
              snapshotMap.set(item.id, item.snapshot);
            }
          });
          setAccountSnapshots(snapshotMap);
        }
      });
    };
    fetchSnapshots();
    return () => {
      ignore = true;
    };
  }, [householdId, accounts, year, month, run]);

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

      const snapshots = await portfolioService.getSnapshots(
        householdId,
        portfolio.id,
        prevYear,
        prevMonth,
      );
      if (!ignore) {
        setPrevSnapshot(snapshots.length > 0 ? snapshots[0] : null);
      }
    };
    fetchPrevSnapshot();
    return () => {
      ignore = true;
    };
  }, [householdId, portfolio.id, year, month]);

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
