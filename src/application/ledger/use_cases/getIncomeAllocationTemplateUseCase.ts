import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';

export interface GetIncomeAllocationTemplateRequest {
  householdId: string;
  ledgerCode: string;
}

export class GetIncomeAllocationTemplateUseCase {
  async execute(request: GetIncomeAllocationTemplateRequest): Promise<AllocationTemplate | null> {
    const { householdId, ledgerCode } = request;

    if (!ledgerCode.startsWith('income:')) {
      return null;
    }

    const exactTemplate = await allocationTemplateRepository.getByLedgerCode(
      householdId,
      ledgerCode,
    );
    if (exactTemplate) return exactTemplate;

    return allocationTemplateRepository.getDefaultTemplate(householdId);
  }
}

export const getIncomeAllocationTemplateUseCase = new GetIncomeAllocationTemplateUseCase();
