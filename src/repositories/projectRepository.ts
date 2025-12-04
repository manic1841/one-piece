import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { type Project, ProjectSchema } from '../schemas/project';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type ProjectFirestore = Omit<Project, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/**
 * ProjectRepository
 * Handles all database operations for Project and ProjectSnapshot entities
 * Follows Repository pattern - separates data access logic from business logic
 */
class ProjectRepository extends BaseRepository<Project, ProjectFirestore, [string, string?]> {
  private readonly collectionName = 'projects';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }
  protected getDocRef(householdId: string, projectId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, projectId);
  }

  protected toFirestore(entity: Project): ProjectFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: ProjectFirestore): Project {
    return ProjectSchema.parse({
      ...data,
      createdAt: convertToDate(data.createdAt),
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const projectRepository = new ProjectRepository(db);
