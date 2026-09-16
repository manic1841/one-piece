import { type FinancialPeriodCreate } from '@/domains/financial_period/schemas';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';

/**
 * Thin period-state access seam (ADR-0050). The workflow organizes use cases
 * per the documented Workflow Pattern; these own the repository dependency.
 */
export interface GetFinancialPeriodRequest {
  householdId: string;
  yearMonth: string;
}

export class GetFinancialPeriodUseCase {
  async execute(request: GetFinancialPeriodRequest) {
    const { householdId, yearMonth } = request;
    return financialPeriodRepository.getPeriod(householdId, yearMonth);
  }
}

export interface SaveFinancialPeriodRequest {
  householdId: string;
  period: FinancialPeriodCreate;
  userEmail: string;
}

export class SaveFinancialPeriodUseCase {
  async execute(request: SaveFinancialPeriodRequest): Promise<void> {
    const { householdId, period, userEmail } = request;
    await financialPeriodRepository.savePeriod(householdId, period, userEmail);
  }
}
