import { type AllocationTemplateItem } from '@/domains/allocation/templateSchemas';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';

export interface UpsertIncomeAllocationTemplateRequest {
  householdId: string;
  userEmail: string;
  ledgerCode: string;
  items: AllocationTemplateItem[];
  name?: string;
}

const buildTemplateName = (ledgerCode: string) => `收入分配 - ${ledgerCode}`;

export class UpsertIncomeAllocationTemplateUseCase {
  async execute(request: UpsertIncomeAllocationTemplateRequest): Promise<string> {
    const { householdId, userEmail, ledgerCode, items, name } = request;

    if (!ledgerCode.startsWith('income:')) {
      throw new Error('Allocation template only supports income:* ledger codes.');
    }

    const normalizedItems = items
      .filter((item) => item.projectId && item.percentage > 0)
      .map((item) => ({
        projectId: item.projectId,
        percentage: item.percentage,
      }));

    const existing = await allocationTemplateRepository.getByLedgerCode(householdId, ledgerCode);

    if (existing) {
      await allocationTemplateRepository.update(
        [householdId, existing.id],
        {
          name: name ?? existing.name,
          items: normalizedItems,
        },
        userEmail,
      );
      return existing.id;
    }

    return allocationTemplateRepository.create(
      [householdId],
      {
        name: name ?? buildTemplateName(ledgerCode),
        ledgerCode,
        isDefault: false,
        items: normalizedItems,
      },
      userEmail,
    );
  }
}

export const upsertIncomeAllocationTemplateUseCase = new UpsertIncomeAllocationTemplateUseCase();
