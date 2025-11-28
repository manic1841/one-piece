import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ProjectSchema,
  type Project,
  ProjectSnapshotSchema,
  type ProjectSnapshot,
  parseWithSchema,
} from '../schemas';
import { BaseService } from './baseService';

class ProjectService extends BaseService<Project> {
  constructor() {
    super('projects', ProjectSchema);
  }

  // Get all projects for a household
  async getProjects(householdId: string): Promise<Project[]> {
    // Remove orderBy to avoid index requirements for now
    // We use getAll without constraints
    const projects = await this.getAll(householdId);

    // Sort in memory
    return projects.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      // Check if it's a Timestamp (has seconds property)
      // BaseService might have converted it to Date or Timestamp depending on schema
      // But let's handle both
      const timeA =
        a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt as Date).getTime();
      const timeB =
        b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt as Date).getTime();
      return timeA - timeB;
    });
  }

  // Create a new project
  async createProject(householdId: string, project: Omit<Project, 'id'>): Promise<string> {
    return this.create(householdId, project);
  }

  // Update a project
  async updateProject(
    householdId: string,
    projectId: string,
    updates: Partial<Project>,
  ): Promise<void> {
    return this.update(householdId, projectId, updates);
  }

  // Delete a project
  async deleteProject(householdId: string, projectId: string): Promise<void> {
    return this.delete(householdId, projectId);
  }

  // Record a project snapshot
  async recordSnapshot(
    householdId: string,
    projectId: string,
    snapshot: Omit<ProjectSnapshot, 'id' | 'createdAt'>,
  ): Promise<string> {
    const snapshotRef = doc(
      collection(db, 'households', householdId, 'projects', projectId, 'snapshots'),
    );
    const snapshotId = snapshotRef.id;

    const newSnapshot = {
      ...snapshot,
      id: snapshotId,
      createdAt: serverTimestamp(),
    };

    await setDoc(snapshotRef, newSnapshot);
    return snapshotId;
  }

  // Get snapshots for a project
  async getSnapshots(
    householdId: string,
    projectId: string,
    year?: number,
    month?: number,
  ): Promise<ProjectSnapshot[]> {
    const snapshotsRef = collection(
      db,
      'households',
      householdId,
      'projects',
      projectId,
      'snapshots',
    );
    let q = query(snapshotsRef, orderBy('year', 'desc'), orderBy('month', 'desc'));

    if (year !== undefined) {
      q = query(q, where('year', '==', year));
    }
    if (month !== undefined) {
      q = query(q, where('month', '==', month));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return parseWithSchema(ProjectSnapshotSchema, data);
    });
  }
}

export const projectService = new ProjectService();
