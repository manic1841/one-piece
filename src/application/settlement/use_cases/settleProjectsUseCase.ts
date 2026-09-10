import { projectRepository } from '@/infra/repositories/projectRepository';

import { buildProjectSettlementSnapshot, loadPeriodWideData } from './buildProjectSettlementSnapshot';

export interface SettleProjectsRequest {
  householdId: string;
  yearMonth: string;
  userEmail: string;
}

export class SettleProjectsUseCase {
  async execute(request: SettleProjectsRequest): Promise<void> {
    const { householdId, yearMonth, userEmail } = request;
    const projects = await projectRepository.getProjects(householdId);

    // Load period-wide allocations and transfers once for all projects
    const periodWideData = await loadPeriodWideData(householdId, yearMonth);

    for (const project of projects) {
      const snapshot = await buildProjectSettlementSnapshot(
        householdId,
        project.id,
        yearMonth,
        periodWideData,
      );
      await projectRepository.saveSnapshot(householdId, project.id, snapshot, userEmail);
    }
  }
}

export const settleProjectsUseCase = new SettleProjectsUseCase();
