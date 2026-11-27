import { withReadPermission } from '@/application/common/readGuard';
import { type AuthContext } from '@/application/types';
import { type ProjectSnapshotCreate } from '@/domains/project/schemas';
import { mapInBatches } from '@/shared/batch';

import {
  buildProjectSettlementSnapshot,
  loadPeriodWideData,
} from './buildProjectSettlementSnapshot';

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
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const periodWideData = await withReadPermission(householdId, auth, () =>
      loadPeriodWideData(householdId, yearMonth),
    );

    // Every project reads the same period-wide bundle, so the rows are independent.
    return mapInBatches(projects, async (project) => ({
      projectId: project.id,
      projectName: project.name,
      ...(await buildProjectSettlementSnapshot(householdId, project.id, yearMonth, periodWideData)),
    }));
  }
}

export const previewProjectSettlementsUseCase = new PreviewProjectSettlementsUseCase();
