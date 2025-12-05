import { BaseRepository } from './baseRepository';
import { db } from '../firebase';
import { type ProjectSnapshot } from '../schemas/project';
import { Timestamp, collection, doc } from 'firebase/firestore';
import { toDate } from '@/utils/dateUtils';

type ProjectSnapshotFirestore = Omit<ProjectSnapshot, 'createdAt'> & {
  createdAt: Timestamp;
};

class ProjectSnapshotRepository extends BaseRepository<
  ProjectSnapshot,
  ProjectSnapshotFirestore,
  [string, string, string?]
> {
  protected getCollectionRef(householdId: string, projectId: string) {
    return collection(this.db, 'households', householdId, 'projects', projectId, 'snapshots');
  }

  protected getDocRef(householdId: string, projectId: string, snapshotId: string) {
    return doc(this.db, 'households', householdId, 'projects', projectId, 'snapshots', snapshotId);
  }

  protected toFirestore(entity: ProjectSnapshot): Partial<ProjectSnapshotFirestore> {
    return {
      ...entity,
      createdAt: entity.createdAt ? Timestamp.fromDate(entity.createdAt) : undefined,
    };
  }

  protected fromFirestore(data: ProjectSnapshotFirestore): ProjectSnapshot {
    return {
      ...data,
      createdAt: toDate(data.createdAt),
    };
  }
}

export const projectSnapshotRepository = new ProjectSnapshotRepository(db);
