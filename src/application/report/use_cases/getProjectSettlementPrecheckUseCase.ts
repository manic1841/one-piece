import { projectRepository } from '@/infra/repositories/projectRepository';

interface GetProjectSettlementPrecheckRequest {
  householdId: string;
  yearMonth: string;
}

export interface ProjectSettlementPrecheckResult {
  hasProjects: boolean;
  allProjectsSettled: boolean;
  unsettledProjectIds: string[];
  unsettledProjectNames: string[];
}

class GetProjectSettlementPrecheckUseCase {
  async execute(
    request: GetProjectSettlementPrecheckRequest,
  ): Promise<ProjectSettlementPrecheckResult> {
    const { householdId, yearMonth } = request;

    const projects = await projectRepository.getProjects(householdId);
    const snapshots = await Promise.all(
      projects.map(async (project) => ({
        projectId: project.id,
        snapshot: await projectRepository.getSnapshot(householdId, project.id, yearMonth),
      })),
    );

    const unsettledProjectIds = snapshots
      .filter(({ snapshot }) => snapshot === null)
      .map(({ projectId }) => projectId);
    const unsettledProjectNames = projects
      .filter((project) => unsettledProjectIds.includes(project.id))
      .map((project) => project.name);

    return {
      hasProjects: projects.length > 0,
      allProjectsSettled: unsettledProjectIds.length === 0,
      unsettledProjectIds,
      unsettledProjectNames,
    };
  }
}

export const getProjectSettlementPrecheckUseCase = new GetProjectSettlementPrecheckUseCase();
