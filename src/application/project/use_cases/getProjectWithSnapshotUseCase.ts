import { type ProjectWithSnapshot } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

import { getProjectUseCase } from './getProjectUseCase';

export interface GetProjectWithSnapshotRequest {
  householdId: string;
  projectId: string;
  year: number;
  month: number;
}

export class GetProjectWithSnapshotUseCase {
  async execute(request: GetProjectWithSnapshotRequest): Promise<ProjectWithSnapshot | null> {
    const { householdId, projectId, year, month } = request;
    const project = await getProjectUseCase.execute({ householdId, projectId });
    if (!project) return null;

    const snapshotId = projectSnapshotRepository.buildId(year, month);
    const snapshot = await projectSnapshotRepository.get([householdId, projectId, snapshotId]);

    return { ...project, snapshot } as ProjectWithSnapshot;
  }
}

export const getProjectWithSnapshotUseCase = new GetProjectWithSnapshotUseCase();
