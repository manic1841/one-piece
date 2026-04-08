import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';

export interface ListAllocationTemplatesRequest {
  householdId: string;
}

export class ListAllocationTemplatesUseCase {
  async execute(request: ListAllocationTemplatesRequest): Promise<AllocationTemplate[]> {
    const { householdId } = request;

    const templates = await allocationTemplateRepository.list([householdId]);

    return templates
      .filter((template) => template.ledgerCode.startsWith('income:'))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.ledgerCode.localeCompare(b.ledgerCode);
      });
  }
}

export const listAllocationTemplatesUseCase = new ListAllocationTemplatesUseCase();
