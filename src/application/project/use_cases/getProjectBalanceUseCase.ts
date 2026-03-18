import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export interface GetProjectBalanceRequest {
  householdId: string;
  projectId: string;
}

export interface ProjectBalanceResponse {
  balance: number;
  year: number;
  month: number;
}

export class GetProjectBalanceUseCase {
  async execute(request: GetProjectBalanceRequest): Promise<ProjectBalanceResponse | null> {
    const { householdId, projectId } = request;
    const project = await projectRepository.get([householdId, projectId]);
    if (!project) return null;

    // Get latest snapshot from project metadata or snapshot repo
    const latestSnapshot = await projectSnapshotRepository.getLatest(householdId, projectId);
    
    return {
      balance: latestSnapshot?.closingBalance ?? 0,
      year: latestSnapshot?.year ?? new Date().getFullYear(),
      month: latestSnapshot?.month ?? new Date().getMonth() + 1,
    };
  }
}

export const getProjectBalanceUseCase = new GetProjectBalanceUseCase();
