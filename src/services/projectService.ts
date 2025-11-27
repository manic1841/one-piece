import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  Timestamp,
  setDoc,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ProjectSchema,
  type Project,
  ProjectSnapshotSchema,
  type ProjectSnapshot,
  parseWithSchema,
} from '../schemas';

export const projectService = {
  // Get all projects for a household
  async getProjects(householdId: string): Promise<Project[]> {
    const projectsRef = collection(db, 'households', householdId, 'projects');
    // Remove orderBy to avoid index requirements for now
    const q = query(projectsRef);
    const snapshot = await getDocs(q);

    const projects = snapshot.docs.map((doc) =>
      ProjectSchema.parse({
        id: doc.id,
        ...doc.data(),
      }),
    );

    // Sort in memory
    return projects.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      // Check if it's a Timestamp (has seconds property)
      if ('seconds' in a.createdAt && 'seconds' in b.createdAt) {
        return a.createdAt.seconds - b.createdAt.seconds;
      }
      return 0;
    });
  },

  // Create a new project
  async createProject(householdId: string, project: Omit<Project, 'id'>): Promise<string> {
    const projectsRef = collection(db, 'households', householdId, 'projects');
    const docRef = await addDoc(projectsRef, {
      ...project,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Update a project
  async updateProject(
    householdId: string,
    projectId: string,
    updates: Partial<Project>,
  ): Promise<void> {
    const projectRef = doc(db, 'households', householdId, 'projects', projectId);
    await updateDoc(projectRef, updates);
  },

  // Delete a project
  async deleteProject(householdId: string, projectId: string): Promise<void> {
    const projectRef = doc(db, 'households', householdId, 'projects', projectId);
    await deleteDoc(projectRef);
  },

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
  },

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
  },
};
