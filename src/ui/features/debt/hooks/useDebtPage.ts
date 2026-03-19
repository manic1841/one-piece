import { useCallback, useEffect, useMemo, useState } from 'react';

import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listDebtPaymentsUseCase } from '@/application/debt/use_cases/listDebtPaymentsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Project } from '@/domains/project/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

/**
 * Use equal-payment amortization to estimate remaining months.
 * Returns a Date representing the projected payoff month.
 */
function estimatePayoffDate(account: DebtAccount): Date | null {
  const { currentBalance, interestRate, monthlyPayment } = account;
  if (monthlyPayment <= 0) return null;

  if (interestRate === 0) {
    const months = Math.ceil(currentBalance / monthlyPayment);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  }

  const r = interestRate / 100 / 12;
  // n = -ln(1 - P*r / M) / ln(1+r)   (from solving amortization for n)
  const ratio = (currentBalance * r) / monthlyPayment;
  if (ratio >= 1) return null; // Payments don't cover interest — no payoff
  const n = -Math.log(1 - ratio) / Math.log(1 + r);
  const months = Math.ceil(n);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

export interface DebtAccountView extends DebtAccount {
  payoffDate: Date | null;
  repaidPercent: number; // 0–100
  projectName: string | null;
}

export function useDebtPage(householdId: string) {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({
      uid: currentUser?.uid || '',
      email: currentUser?.email || '',
      isGlobalAdmin: isAdmin,
    }),
    [currentUser, isAdmin],
  );

  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const { loading, error, run } = useLoadingTask();

  const loadData = useCallback(async () => {
    if (!householdId) return;
    await run(async () => {
      const [accounts, projs] = await Promise.all([
        listDebtAccountsUseCase.execute({ householdId }),
        listProjectsUseCase.execute({ householdId }),
      ]);
      setDebtAccounts(accounts);
      setProjects(projs);
    });
  }, [householdId, run]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Enrich debt accounts with computed fields
  const debtAccountViews = useMemo<DebtAccountView[]>(() => {
    return debtAccounts.map((account) => ({
      ...account,
      payoffDate: estimatePayoffDate(account),
      repaidPercent:
        account.originalAmount > 0
          ? Math.round(
              ((account.originalAmount - account.currentBalance) / account.originalAmount) * 100,
            )
          : 0,
      projectName: account.linkedProjectId
        ? (projectMap.get(account.linkedProjectId)?.name ?? null)
        : null,
    }));
  }, [debtAccounts, projectMap]);

  // Page-level summaries
  const totalDebt = useMemo(
    () => debtAccounts.reduce((s, a) => s + a.currentBalance, 0),
    [debtAccounts],
  );

  const totalMonthlyPayment = useMemo(
    () => debtAccounts.reduce((s, a) => s + a.monthlyPayment, 0),
    [debtAccounts],
  );

  const getPaymentHistory = useCallback(
    async (debtAccountId: string) => {
      if (!householdId) return [];
      return listDebtPaymentsUseCase.execute({ householdId, debtAccountId, auth });
    },
    [householdId, auth],
  );

  return {
    loading,
    error,
    debtAccountViews,
    projects,
    totalDebt,
    totalMonthlyPayment,
    getPaymentHistory,
    reload: loadData,
  };
}
