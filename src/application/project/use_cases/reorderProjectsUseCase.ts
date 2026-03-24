import { projectRepository } from '@/infra/repositories/projectRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

export interface ReorderProjectsRequest {
  householdId: string;
  projectOrders: Array<{ id: string; order: number }>;
  userEmail: string;
  auth: AuthContext;
}

export class ReorderProjectsUseCase {
  async execute(request: ReorderProjectsRequest): Promise<void> {
    const { householdId, projectOrders, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);
    
    // Simple implementation: update each project's order
    await Promise.all(
      projectOrders.map((po) =>
        projectRepository.update([householdId, po.id], { order: po.order } as Partial<Parameters<typeof projectRepository.update>[1]>, userEmail)
      )
    );
  }
}

export const reorderProjectsUseCase = new ReorderProjectsUseCase();
