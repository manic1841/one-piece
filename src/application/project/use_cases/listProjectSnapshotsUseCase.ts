import { type QueryConstraint, orderBy, where } from 'firebase/firestore';

import { type ProjectSnapshot } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export interface ListProjectSnapshotsRequest {
  householdId: string;
  projectId: string;
  yearMonth?: string;
  /** Inclusive `YYYY-MM` lower bound of the queried window. */
  fromYearMonth?: string;
  /** Inclusive `YYYY-MM` upper bound of the queried window. */
  toYearMonth?: string;
  /** Cap on the snapshots returned for the window. */
  limit?: number;
}

export class ListProjectSnapshotsUseCase {
  async execute(request: ListProjectSnapshotsRequest): Promise<ProjectSnapshot[]> {
    const {
      householdId,
      projectId,
      yearMonth,
      fromYearMonth,
      toYearMonth,
      limit: maxLimit,
    } = request;
    if (yearMonth) {
      const snap = await projectSnapshotRepository.get([householdId, projectId, yearMonth]);
      return snap ? [snap] : [];
    }

    // Year-only range first: Firestore can serve it from an index, then the id
    // trim below narrows to the actual months.
    const constraints: QueryConstraint[] = [];
    if (fromYearMonth) {
      constraints.push(where('year', '>=', Number(fromYearMonth.slice(0, 4))));
    }
    if (toYearMonth) {
      constraints.push(where('year', '<=', Number(toYearMonth.slice(0, 4))));
    }
    constraints.push(orderBy('year', 'desc'), orderBy('month', 'desc'));

    const snapshots = await projectSnapshotRepository.list([householdId, projectId], constraints);

    // The year-only constraint above over-selects the window's edge years; trim
    // against the snapshot id, which is the `YYYY-MM` month key. Trimming happens
    // before any limit so an edge year cannot hide older in-range snapshots.
    const inWindow = snapshots.filter(
      (snapshot) =>
        (!fromYearMonth || snapshot.id >= fromYearMonth) &&
        (!toYearMonth || snapshot.id <= toYearMonth),
    );

    return maxLimit === undefined ? inWindow : inWindow.slice(0, maxLimit);
  }
}

export const listProjectSnapshotsUseCase = new ListProjectSnapshotsUseCase();
