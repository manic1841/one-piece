import { collection, doc } from 'firebase/firestore';

import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type ProjectSnapshot, ProjectSnapshotSchema } from '@/schemas/';

class ProjectSnapshotRepository extends BaseRepository<ProjectSnapshot, [string, string, string?]> {
  protected getCollectionRef(householdId: string, projectId: string) {
    return collection(this.db, 'households', householdId, 'projects', projectId, 'snapshots');
  }

  protected getDocRef(householdId: string, projectId: string, snapshotId: string) {
    return doc(this.db, 'households', householdId, 'projects', projectId, 'snapshots', snapshotId);
  }
  protected getDomainSchema() {
    return ProjectSnapshotSchema;
  }

  buildId(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

export const projectSnapshotRepository = new ProjectSnapshotRepository(db);
