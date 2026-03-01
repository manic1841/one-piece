import { useCallback } from 'react';

import { type Portfolio, type PortfolioCreate } from '@/schemas';
import { portfolioService } from '@/services/portfolioService';

export const usePortfolioCmds = (householdId?: string, email?: string) => {
  const createPortfolio = useCallback(
    async (portfolio: PortfolioCreate) => {
      if (!householdId || !email) return;
      return await portfolioService.createPortfolio(householdId, portfolio, email);
    },
    [householdId, email],
  );

  const updatePortfolio = useCallback(
    async (id: string, updates: Partial<Portfolio>) => {
      if (!householdId || !email) return;
      await portfolioService.updatePortfolio(householdId, id, updates, email);
    },
    [householdId, email],
  );

  const deletePortfolio = useCallback(
    async (id: string) => {
      if (!householdId) return;
      await portfolioService.deletePortfolio(householdId, id);
    },
    [householdId],
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
      );
    },
    [householdId, email],
  );

  return {
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    createSnapshot,
    deleteSnapshot: useCallback(
      async (portfolioId: string, snapshotId: string) => {
        if (!householdId) return;
        await portfolioService.deleteSnapshot(householdId, portfolioId, snapshotId);
      },
      [householdId],
    ),
  };
};
