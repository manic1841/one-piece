import { LedgerValidator } from '@/domains/ledger/validator';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { type AllocationCreate } from '@/infra/schemas/allocation';

export interface CreateAllocationRequest {
  householdId: string;
  userEmail: string;
  data: {
    transactionId: string;
    totalAmount: number;
    items: { projectId: string; percentage: number }[];
  };
}

export class CreateAllocationUseCase {
  async execute(request: CreateAllocationRequest): Promise<string> {
    const { householdId, userEmail, data } = request;

    // Validate percentage sums to 100
    const totalPercentage = data.items.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`);
    }

    const allocationData: AllocationCreate = {
      date: new Date(),
      sourceTransactionId: data.transactionId,
      totalAmount: data.totalAmount,
      items: data.items.map((item) => ({
        projectId: item.projectId,
        percentage: item.percentage,
        // Calculate amount and ensure we distribute any rounding errors if needed,
        // but simple Math.round is used here to match original logic.
        amount: Math.round((data.totalAmount * item.percentage) / 100),
      })),
      projectIds: data.items.map((item) => item.projectId),
      createdBy: userEmail,
    };

    const validationErrors = LedgerValidator.validateAllocation(allocationData);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid allocation: ${validationErrors.join(', ')}`);
    }

    const allocationId = await allocationRepository.create(
      [householdId],
      allocationData,
      userEmail,
    );

    // Update the transaction with the new allocationId
    await transactionRepository.updateAllocationId(
      householdId,
      data.transactionId,
      allocationId,
      userEmail,
    );

    return allocationId;
  }
}

export const createAllocationUseCase = new CreateAllocationUseCase();
