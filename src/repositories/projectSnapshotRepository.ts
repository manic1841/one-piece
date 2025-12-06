import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type ProjectSnapshot, ProjectSnapshotSchema } from '@/schemas/';
import { collection, doc } from 'firebase/firestore';

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
}

export const projectSnapshotRepository = new ProjectSnapshotRepository(db);
