import { db } from '@/firebase';
import { BaseRepository } from '@/repositories/baseRepository';
import { type Project, ProjectSchema } from '@/schemas';
import { collection, doc } from 'firebase/firestore';

/**
 * ProjectRepository
 * Handles all database operations for Project and ProjectSnapshot entities
 * Follows Repository pattern - separates data access logic from business logic
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
}

export const projectRepository = new ProjectRepository(db);
