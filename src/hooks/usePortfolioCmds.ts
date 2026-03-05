import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { type Portfolio, type PortfolioCreate } from '@/schemas';
import { portfolioService } from '@/services/portfolioService';

export const usePortfolioCmds = (householdId?: string, email?: string) => {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const createPortfolio = useCallback(
    async (portfolio: PortfolioCreate) => {
      if (!householdId || !email) return;
      return await portfolioService.createPortfolio(householdId, portfolio, email, auth);
    },
    [householdId, email, auth],
  );

  const updatePortfolio = useCallback(
    async (id: string, updates: Partial<Portfolio>) => {
      if (!householdId || !email) return;
      await portfolioService.updatePortfolio(householdId, id, updates, email, auth);
    },
    [householdId, email, auth],
  );

  const deletePortfolio = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await portfolioService.deletePortfolio(householdId, id, auth);
    },
    [householdId, auth],
  );

  const createSnapshot = useCallback(
    async (
      portfolioId: string,
      year: number,
      month: number,
      cashFlow: { deposits: number; withdrawals: number } = { deposits: 0, withdrawals: 0 },
    ) => {
      if (!householdId || !email) return;
      return await portfolioService.createSnapshot(
        householdId,
        portfolioId,
        year,
        month,
        cashFlow,
        email,
        auth,
      );
    },
    [householdId, email, auth],
  );

  return {
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    createSnapshot,
    deleteSnapshot: useCallback(
      async (portfolioId: string, snapshotId: string) => {
        if (!householdId) return;
        await portfolioService.deleteSnapshot(householdId, portfolioId, snapshotId, auth);
      },
      [householdId, auth],
    ),
  };
};
