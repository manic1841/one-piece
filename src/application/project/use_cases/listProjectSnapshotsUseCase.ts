import { orderBy, limit as firestoreLimit, type QueryConstraint } from 'firebase/firestore';
import { type ProjectSnapshot } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export interface ListProjectSnapshotsRequest {
  householdId: string;
  projectId: string;
  yearMonth?: string;
  limit?: number;
}

export class ListProjectSnapshotsUseCase {
  async execute(request: ListProjectSnapshotsRequest): Promise<ProjectSnapshot[]> {
    const { householdId, projectId, yearMonth, limit: maxLimit } = request;
    if (yearMonth) {
      const snap = await projectSnapshotRepository.get([householdId, projectId, yearMonth]);
      return snap ? [snap] : [];
    }
    
    const constraints: QueryConstraint[] = [orderBy('year', 'desc'), orderBy('month', 'desc')];
    if (maxLimit) {
      constraints.push(firestoreLimit(maxLimit));
    }
    
    return projectSnapshotRepository.list([householdId, projectId], constraints);
  }
}

export const listProjectSnapshotsUseCase = new ListProjectSnapshotsUseCase();
