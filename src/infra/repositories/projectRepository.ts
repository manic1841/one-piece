import { collection, doc, limit, orderBy, where } from 'firebase/firestore';

import {
  type Project,
  type ProjectCreate,
  ProjectSchema,
  type ProjectSnapshot,
  type ProjectSnapshotCreate,
} from '@/domains/project/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';

export {
  type Project,
  type ProjectCreate,
  ProjectSchema,
  type ProjectSnapshot,
  type ProjectSnapshotCreate,
};

/**
 * v2 ProjectRepository
 * Path: households/{householdId}/projects
 */
class ProjectRepository extends BaseRepository<Project, [string, string?]> {
  private readonly collectionName = 'projects';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, projectId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, projectId);
  }

  protected getDomainSchema() {
    return ProjectSchema;
  }

  async getProjects(householdId: string, includeInactive = false): Promise<Project[]> {
    const constraints: import('firebase/firestore').QueryConstraint[] = [orderBy('order', 'asc')];
    if (!includeInactive) {
      constraints.push(where('isActive', '==', true));
    }
    return this.list([householdId], constraints);
  }

  async createProject(
    householdId: string,
    data: ProjectCreate,
    userEmail: string,
  ): Promise<string> {
    return this.create([householdId], data, userEmail);
  }

  async updateProject(
    householdId: string,
    projectId: string,
    data: Partial<ProjectCreate>,
    userEmail: string,
  ): Promise<void> {
    await this.update([householdId, projectId], data, userEmail);
  }

  async archiveProject(householdId: string, projectId: string, userEmail: string): Promise<void> {
    await this.update([householdId, projectId], { isActive: false }, userEmail);
  }

  async getSnapshot(
    householdId: string,
    projectId: string,
    yearMonth: string,
  ): Promise<ProjectSnapshot | null> {
    return projectSnapshotRepository.get([householdId, projectId, yearMonth]);
  }

  async saveSnapshot(
    householdId: string,
    projectId: string,
    snapshot: ProjectSnapshotCreate,
    userEmail: string,
  ): Promise<void> {
    const snapshotId = projectSnapshotRepository.buildId(snapshot.year, snapshot.month);
    
    // Upsert mechanism: check if exists
    const existing = await projectSnapshotRepository.get([householdId, projectId, snapshotId]);
    
    if (existing) {
      await projectSnapshotRepository.update(
        [householdId, projectId, snapshotId],
        snapshot,
        userEmail,
      );
    } else {
      await projectSnapshotRepository.create(
        [householdId, projectId],
        snapshot,
        userEmail,
        undefined,
        snapshotId
      );
    }
  }

  async getSnapshotHistory(
    householdId: string,
    projectId: string,
    months: number,
  ): Promise<ProjectSnapshot[]> {
    return projectSnapshotRepository.list(
      [householdId, projectId],
      [orderBy('year', 'desc'), orderBy('month', 'desc'), limit(months)],
    );
  }
}

export const projectRepository = new ProjectRepository(db);
