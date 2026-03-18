import { type Project } from '@/domains/project/schemas';
import { projectRepository } from '@/infra/repositories/projectRepository';

export interface GetProjectRequest {
  householdId: string;
  projectId: string;
}

export class GetProjectUseCase {
  async execute(request: GetProjectRequest): Promise<Project | null> {
    const { householdId, projectId } = request;
    return projectRepository.get([householdId, projectId]);
  }
}

export const getProjectUseCase = new GetProjectUseCase();
