import { type QueryConstraint, limit, orderBy, where } from 'firebase/firestore';

import { type ProjectSnapshot } from '@/domains/project/schemas';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { SNAPSHOT_HISTORY_LIMIT } from '@/shared/readLimits';

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

    // Year-only range first, then the id trim below narrows to the actual months.
    const constraints: QueryConstraint[] = [];
    if (fromYearMonth) {
      constraints.push(where('year', '>=', Number(fromYearMonth.slice(0, 4))));
    }
    if (toYearMonth) {
      constraints.push(where('year', '<=', Number(toYearMonth.slice(0, 4))));
    }
    constraints.push(
      orderBy('year', 'desc'),
      orderBy('month', 'desc'),
      // 由新到舊，截斷才會落在最舊的一端。
      limit(SNAPSHOT_HISTORY_LIMIT),
    );

    const snapshots = await projectSnapshotRepository.list([householdId, projectId], constraints);

    // The year-only constraint above over-selects the window's edge years; trim
    // against the snapshot id, which is the `YYYY-MM` month key. The limit runs
    // first, so the window has to fit inside it for the trim to be exhaustive.
    const inWindow = snapshots.filter(
      (snapshot) =>
        (!fromYearMonth || snapshot.id >= fromYearMonth) &&
        (!toYearMonth || snapshot.id <= toYearMonth),
    );

    return maxLimit === undefined ? inWindow : inWindow.slice(0, maxLimit);
  }
}

export const listProjectSnapshotsUseCase = new ListProjectSnapshotsUseCase();
