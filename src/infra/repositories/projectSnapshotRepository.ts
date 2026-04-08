import { collection, doc, limit, orderBy } from 'firebase/firestore';

import { type ProjectSnapshot, ProjectSnapshotSchema } from '@/domains/project/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

/**
 * ProjectSnapshotRepository
 * Path: households/{householdId}/projects/{projectId}/snapshots
 */
class ProjectSnapshotRepository extends BaseRepository<ProjectSnapshot, [string, string, string?]> {
  private readonly collectionName = 'snapshots';

  protected getCollectionRef(householdId: string, projectId: string) {
    return collection(
      this.db,
      'households',
      householdId,
      'projects',
      projectId,
      this.collectionName,
    );
  }

  protected getDocRef(householdId: string, projectId: string, snapshotId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      'projects',
      projectId,
      this.collectionName,
      snapshotId,
    );
  }

  protected getDomainSchema() {
    return ProjectSnapshotSchema;
  }

  buildId(year: number, month: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  async getLatest(householdId: string, projectId: string): Promise<ProjectSnapshot | null> {
    const result = await this.list(
      [householdId, projectId],
      [orderBy('year', 'desc'), orderBy('month', 'desc'), limit(1)],
    );
    return result[0] || null;
  }
}

export const projectSnapshotRepository = new ProjectSnapshotRepository(db);
