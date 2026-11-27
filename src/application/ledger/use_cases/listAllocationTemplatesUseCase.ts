import { limit, orderBy } from 'firebase/firestore';

import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';
import { MASTER_LIST_LIMIT } from '@/shared/readLimits';

export interface ListAllocationTemplatesRequest {
  householdId: string;
}

export class ListAllocationTemplatesUseCase {
  async execute(request: ListAllocationTemplatesRequest): Promise<AllocationTemplate[]> {
    const { householdId } = request;

    const templates = await allocationTemplateRepository.list(
      [householdId],
      // 固定順序，截斷才會穩定落在同一批範本。
      [orderBy('__name__'), limit(MASTER_LIST_LIMIT)],
    );

    return templates
      .filter((template) => template.ledgerCode.startsWith('income:'))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.ledgerCode.localeCompare(b.ledgerCode);
      });
  }
}

export const listAllocationTemplatesUseCase = new ListAllocationTemplatesUseCase();
