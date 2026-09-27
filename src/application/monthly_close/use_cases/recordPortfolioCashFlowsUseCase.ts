import { createPortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/createPortfolioSnapshotUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { type AuthContext } from '@/application/types';

export interface RecordPortfolioCashFlowsRequest {
  householdId: string;
  year: number;
  month: number;
  portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  userEmail: string;
  auth: AuthContext;
}

/**
 * PORTFOLIO_CASH_FLOW stage action: idempotently writes one cash-flow snapshot
 * per portfolio; portfolios that already hold a month snapshot are rewritten
 * with the submitted inputs (same-key overwrite), missing inputs zero-fill
 * (ADR-0052).
 */
export class RecordPortfolioCashFlowsUseCase {
  async execute(request: RecordPortfolioCashFlowsRequest): Promise<void> {
    const { householdId, year, month, portfolioCashFlows, userEmail, auth } = request;
    const portfolios = await listPortfoliosUseCase.execute({ householdId, auth });

    for (const portfolio of portfolios) {
      await createPortfolioSnapshotUseCase.execute({
        householdId,
        portfolioId: portfolio.id,
        year,
        month,
        cashFlow: portfolioCashFlows[portfolio.id] ?? { deposits: 0, withdrawals: 0 },
        userEmail,
        auth,
      });
    }
  }
}
