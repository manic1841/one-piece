import { type AllocationTemplateItem } from '@/domains/allocation/templateSchemas';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';

export interface SaveAllocationTemplateRequest {
  householdId: string;
  userEmail: string;
  data: {
    id?: string;
    name: string;
    ledgerCode: string;
    isDefault: boolean;
    items: AllocationTemplateItem[];
  };
}

const normalizeItems = (items: AllocationTemplateItem[]) =>
  items
    .filter((item) => item.projectId && item.percentage > 0)
    .map((item) => ({
      projectId: item.projectId,
      percentage: item.percentage,
    }));

export class SaveAllocationTemplateUseCase {
  async execute(request: SaveAllocationTemplateRequest): Promise<string> {
    const { householdId, userEmail, data } = request;

    if (!data.ledgerCode.startsWith('income:')) {
      throw new Error('Template ledgerCode must start with income:.');
    }

    const name = data.name.trim();
    if (!name) throw new Error('Template name is required.');

    const items = normalizeItems(data.items);
    if (items.length === 0) {
      throw new Error('Template requires at least one allocation item.');
    }

    const existingTemplates = await allocationTemplateRepository.list([householdId]);
    const duplicate = existingTemplates.find(
      (template) => template.ledgerCode === data.ledgerCode && template.id !== data.id,
    );

    if (duplicate) {
      throw new Error(`Template already exists for ledgerCode: ${data.ledgerCode}`);
    }

    if (data.isDefault) {
      const defaultTemplates = existingTemplates.filter(
        (template) => template.isDefault && template.id !== data.id,
      );

      await Promise.all(
        defaultTemplates.map((template) =>
          allocationTemplateRepository.update(
            [householdId, template.id],
            { isDefault: false },
            userEmail,
          ),
        ),
      );
    }

    if (data.id) {
      await allocationTemplateRepository.update(
        [householdId, data.id],
        {
          name,
          ledgerCode: data.ledgerCode,
          isDefault: data.isDefault,
          items,
        },
        userEmail,
      );
      return data.id;
    }

    return allocationTemplateRepository.create(
      [householdId],
      {
        name,
        ledgerCode: data.ledgerCode,
        isDefault: data.isDefault,
        items,
      },
      userEmail,
    );
  }
}

export const saveAllocationTemplateUseCase = new SaveAllocationTemplateUseCase();
