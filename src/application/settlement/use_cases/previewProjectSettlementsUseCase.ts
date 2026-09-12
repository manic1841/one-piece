import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type ProjectSnapshotCreate } from '@/domains/project/schemas';

import { buildProjectSettlementSnapshot, loadPeriodWideData } from './buildProjectSettlementSnapshot';

export interface PreviewProjectSettlementsRequest {
  householdId: string;
  projects: { id: string; name: string }[];
  year: number;
  month: number;
  auth: AuthContext;
}

export type ProjectSettlementPreview = ProjectSnapshotCreate & {
  projectId: string;
  projectName: string;
};

export class PreviewProjectSettlementsUseCase {
  async execute(request: PreviewProjectSettlementsRequest): Promise<ProjectSettlementPreview[]> {
    const { householdId, projects, year, month, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const periodWideData = await loadPeriodWideData(householdId, yearMonth);
    const previews: ProjectSettlementPreview[] = [];

    for (const project of projects) {
      const snapshot = await buildProjectSettlementSnapshot(
        householdId,
        project.id,
        yearMonth,
        periodWideData,
      );
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
