import { type ProjectSnapshotCreate } from '@/domains/project/schemas';

import { buildProjectSettlementSnapshot } from './buildProjectSettlementSnapshot';

export interface PreviewProjectSettlementsRequest {
  householdId: string;
  projects: { id: string; name: string }[];
  year: number;
  month: number;
}

export type ProjectSettlementPreview = ProjectSnapshotCreate & {
  projectId: string;
  projectName: string;
};

export class PreviewProjectSettlementsUseCase {
  async execute(request: PreviewProjectSettlementsRequest): Promise<ProjectSettlementPreview[]> {
    const { householdId, projects, year, month } = request;
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const previews: ProjectSettlementPreview[] = [];

    for (const project of projects) {
      const snapshot = await buildProjectSettlementSnapshot(householdId, project.id, yearMonth);
      previews.push({
        projectId: project.id,
        projectName: project.name,
        ...snapshot,
      });
    }

    return previews;
  }
}

export const previewProjectSettlementsUseCase = new PreviewProjectSettlementsUseCase();
