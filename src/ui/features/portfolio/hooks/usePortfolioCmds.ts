import { useCallback, useMemo } from 'react';

import { createPortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/createPortfolioSnapshotUseCase';
import { createPortfolioUseCase } from '@/application/portfolio/use_cases/createPortfolioUseCase';
import { deletePortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/deletePortfolioSnapshotUseCase';
import { deletePortfolioUseCase } from '@/application/portfolio/use_cases/deletePortfolioUseCase';
import { reorderPortfoliosUseCase } from '@/application/portfolio/use_cases/reorderPortfoliosUseCase';
import { updatePortfolioUseCase } from '@/application/portfolio/use_cases/updatePortfolioUseCase';
import { type Portfolio, type PortfolioCreate } from '@/domains/portfolio/types/portfolio';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function usePortfolioCmds(householdId: string, email: string, onComplete?: () => void) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser?.uid, isAdmin],
  );

  const createPortfolio = useCallback(
    async (portfolio: PortfolioCreate) => {
      return run(async () => {
        const id = await createPortfolioUseCase.execute({
          householdId,
          portfolio,
          userEmail: email,
          auth,
        });
        onComplete?.();
        return id;
      });
    },
    [householdId, email, auth, run, onComplete],
  );

  const updatePortfolio = useCallback(
    async (portfolioId: string, updates: Partial<Portfolio>) => {
      return run(async () => {
        await updatePortfolioUseCase.execute({
          householdId,
          portfolioId,
          updates,
          userEmail: email,
          auth,
        });
        onComplete?.();
      });
    },
    [householdId, email, auth, run, onComplete],
  );

  const deletePortfolio = useCallback(
    async (portfolioId: string) => {
      return run(async () => {
        await deletePortfolioUseCase.execute({ householdId, portfolioId, auth });
        onComplete?.();
      });
    },
    [householdId, auth, run, onComplete],
  );

  const reorderPortfolios = useCallback(
    async (portfolioOrders: Array<{ id: string; order: number }>) => {
      return run(async () => {
        await reorderPortfoliosUseCase.execute({
          householdId,
          portfolioOrders,
          userEmail: email,
          auth,
        });
        onComplete?.();
      });
    },
    [householdId, email, auth, run, onComplete],
  );

  const createSnapshot = useCallback(
    async (
      portfolioId: string,
      year: number,
      month: number,
      cashFlow: { deposits: number; withdrawals: number },
    ) => {
      return run(async () => {
        await createPortfolioSnapshotUseCase.execute({
          householdId,
          portfolioId,
          year,
          month,
          cashFlow,
          userEmail: email,
          auth,
        });
        onComplete?.();
      });
    },
    [householdId, email, auth, run, onComplete],
  );

  const deleteSnapshot = useCallback(
    async (portfolioId: string, snapshotId: string) => {
      return run(async () => {
        await deletePortfolioSnapshotUseCase.execute({
          householdId,
          portfolioId,
          snapshotId,
          auth,
        });
        onComplete?.();
      });
    },
    [householdId, auth, run, onComplete],
  );

  return {
    loading,
    error,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    reorderPortfolios,
    createSnapshot,
    deleteSnapshot,
  };
}
