import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ArchiveProjectRequest {
  householdId: string;
  projectId: string;
  userEmail: string;
  auth: AuthContext;
}

export class ArchiveProjectUseCase {
  async execute(request: ArchiveProjectRequest): Promise<void> {
    const { householdId, projectId, userEmail, auth } = request;
    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const recentTransactions = await transactionRepository.getTransactionsByProject(
      householdId,
      projectId,
      yearMonth,
    );

    if (recentTransactions.length > 0) {
      throw new Error('Cannot archive project with active transactions in the current month.');
    }

    await projectRepository.archiveProject(householdId, projectId, userEmail);
  }
}

export const archiveProjectUseCase = new ArchiveProjectUseCase();
