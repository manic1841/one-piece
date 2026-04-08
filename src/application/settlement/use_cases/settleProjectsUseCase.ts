import { projectRepository } from '@/infra/repositories/projectRepository';

import { buildProjectSettlementSnapshot } from './buildProjectSettlementSnapshot';

export interface SettleProjectsRequest {
  householdId: string;
  yearMonth: string;
  userEmail: string;
}

export class SettleProjectsUseCase {
  async execute(request: SettleProjectsRequest): Promise<void> {
    const { householdId, yearMonth, userEmail } = request;
    const projects = await projectRepository.getProjects(householdId);

    for (const project of projects) {
      const snapshot = await buildProjectSettlementSnapshot(householdId, project.id, yearMonth);
      await projectRepository.saveSnapshot(householdId, project.id, snapshot, userEmail);
    }
  }
}

export const settleProjectsUseCase = new SettleProjectsUseCase();
