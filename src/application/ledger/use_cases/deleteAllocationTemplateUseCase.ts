import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';

export interface DeleteAllocationTemplateRequest {
  householdId: string;
  templateId: string;
}

export class DeleteAllocationTemplateUseCase {
  async execute(request: DeleteAllocationTemplateRequest): Promise<void> {
    const { householdId, templateId } = request;
    await allocationTemplateRepository.delete([householdId, templateId]);
  }
}

export const deleteAllocationTemplateUseCase = new DeleteAllocationTemplateUseCase();
