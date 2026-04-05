import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Allocation } from '@/domains/allocation/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';

export interface GetTransactionAllocationRequest {
  householdId: string;
  transactionId: string;
  auth: AuthContext;
}

export class GetTransactionAllocationUseCase {
  async execute(request: GetTransactionAllocationRequest): Promise<Allocation | null> {
    const { householdId, transactionId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return allocationRepository.getBySourceTransactionId(householdId, transactionId);
  }
}

export const getTransactionAllocationUseCase = new GetTransactionAllocationUseCase();
