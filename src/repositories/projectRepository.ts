import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    type DocumentData,
    type WithFieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    ProjectSchema,
    type Project,
    ProjectSnapshotSchema,
    type ProjectSnapshot,
} from '../schemas/project';

/**
 * ProjectRepository
 * Handles all database operations for Project and ProjectSnapshot entities
 * Follows Repository pattern - separates data access logic from business logic
 */
class ProjectRepository {
    private readonly collectionName = 'projects';
    private readonly snapshotsCollectionName = 'snapshots';

    /**
     * Get collection reference for projects
     */
    private getProjectsCollectionRef(householdId: string) {
        return collection(db, 'households', householdId, this.collectionName);
    }

    /**
     * Get document reference for a specific project
     */
    private getProjectDocRef(householdId: string, projectId: string) {
        return doc(db, 'households', householdId, this.collectionName, projectId);
    }

    /**
     * Get collection reference for project snapshots
     */
    private getSnapshotsCollectionRef(householdId: string, projectId: string) {
        return collection(
            db,
            'households',
            householdId,
            this.collectionName,
            projectId,
            this.snapshotsCollectionName
        );
    }

    /**
     * Get document reference for a specific snapshot
     */
    private getSnapshotDocRef(householdId: string, projectId: string, snapshotId: string) {
        return doc(
            db,
            'households',
            householdId,
            this.collectionName,
            projectId,
            this.snapshotsCollectionName,
            snapshotId
        );
    }

    /**
     * Parse project data with Zod schema
     */
    private parseProject(data: DocumentData): Project {
        return ProjectSchema.parse(data);
    }

    /**
     * Parse snapshot data with Zod schema
     */
    private parseSnapshot(data: DocumentData): ProjectSnapshot {
        return ProjectSnapshotSchema.parse(data);
    }

    // ==================== Project CRUD Operations ====================

    /**
     * Create a new project
     */
    async create(
        householdId: string,
        data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
        const docRef = doc(this.getProjectsCollectionRef(householdId));
        const id = docRef.id;

        const newProject = {
            ...data,
            id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(docRef, newProject as WithFieldValue<DocumentData>);
        return id;
    }

    /**
     * Get a project by ID
     */
    async getById(householdId: string, projectId: string): Promise<Project | null> {
        const docSnap = await getDoc(this.getProjectDocRef(householdId, projectId));

        if (docSnap.exists()) {
            return this.parseProject(docSnap.data());
        }
        return null;
    }

    /**
     * Get all projects for a household
     */
    async getAll(householdId: string): Promise<Project[]> {
        const q = query(this.getProjectsCollectionRef(householdId));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => this.parseProject(doc.data()));
    }

    /**
     * Get projects by filter criteria
     */
    async getByFilter(
        householdId: string,
        filters: {
            isActive?: boolean;
            category?: string;
            isPersonal?: boolean;
        }
    ): Promise<Project[]> {
        let q = query(this.getProjectsCollectionRef(householdId));

        if (filters.isActive !== undefined) {
            q = query(q, where('isActive', '==', filters.isActive));
        }
        if (filters.category) {
            q = query(q, where('category', '==', filters.category));
        }
        if (filters.isPersonal !== undefined) {
            q = query(q, where('isPersonal', '==', filters.isPersonal));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => this.parseProject(doc.data()));
    }

    /**
     * Update a project
     */
    async update(
        householdId: string,
        projectId: string,
        updates: Partial<Omit<Project, 'id' | 'createdAt'>>
    ): Promise<void> {
        const docRef = this.getProjectDocRef(householdId, projectId);

        // Convert Date objects to Timestamps and add updatedAt
        const processedUpdates = { ...updates } as DocumentData;
        processedUpdates.updatedAt = serverTimestamp();

        Object.keys(processedUpdates).forEach((key) => {
            if (processedUpdates[key] instanceof Date) {
                processedUpdates[key] = Timestamp.fromDate(processedUpdates[key]);
            }
        });

        await updateDoc(docRef, processedUpdates);
    }

    /**
     * Delete a project
     */
    async delete(householdId: string, projectId: string): Promise<void> {
        await deleteDoc(this.getProjectDocRef(householdId, projectId));
    }

    /**
     * Soft delete - mark as inactive instead of deleting
     */
    async softDelete(householdId: string, projectId: string): Promise<void> {
        await this.update(householdId, projectId, { isActive: false });
    }

    // ==================== ProjectSnapshot Operations ====================

    /**
     * Create a new project snapshot
     */
    async createSnapshot(
        householdId: string,
        projectId: string,
        snapshotData: Omit<ProjectSnapshot, 'id' | 'createdAt'>
    ): Promise<string> {
        const snapshotRef = doc(this.getSnapshotsCollectionRef(householdId, projectId));
        const snapshotId = snapshotRef.id;

        const newSnapshot = {
            ...snapshotData,
            id: snapshotId,
            createdAt: serverTimestamp(),
        };

        await setDoc(snapshotRef, newSnapshot as WithFieldValue<DocumentData>);
        return snapshotId;
    }

    /**
     * Get snapshots for a project with optional year/month filter
     */
    async getSnapshots(
        householdId: string,
        projectId: string,
        options?: {
            year?: number;
            month?: number;
        }
    ): Promise<ProjectSnapshot[]> {
        let q = query(
            this.getSnapshotsCollectionRef(householdId, projectId),
            orderBy('year', 'desc'),
            orderBy('month', 'desc')
        );

        if (options?.year !== undefined) {
            q = query(q, where('year', '==', options.year));
        }
        if (options?.month !== undefined) {
            q = query(q, where('month', '==', options.month));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => this.parseSnapshot(doc.data()));
    }

    /**
     * Get a specific snapshot by ID
     */
    async getSnapshotById(
        householdId: string,
        projectId: string,
        snapshotId: string
    ): Promise<ProjectSnapshot | null> {
        const docSnap = await getDoc(
            this.getSnapshotDocRef(householdId, projectId, snapshotId)
        );

        if (docSnap.exists()) {
            return this.parseSnapshot(docSnap.data());
        }
        return null;
    }

    /**
     * Get snapshots for multiple projects
     */
    async getSnapshotsForProjects(
        householdId: string,
        projectIds: string[],
        options?: {
            startYear?: number;
            endYear?: number;
        }
    ): Promise<Array<ProjectSnapshot & { projectId: string }>> {
        const allSnapshots: Array<ProjectSnapshot & { projectId: string }> = [];

        for (const projectId of projectIds) {
            if (options?.startYear && options?.endYear) {
                for (let year = options.startYear; year <= options.endYear; year++) {
                    const snapshots = await this.getSnapshots(householdId, projectId, { year });
                    snapshots.forEach((snapshot) => {
                        allSnapshots.push({ ...snapshot, projectId });
                    });
                }
            } else {
                const snapshots = await this.getSnapshots(householdId, projectId);
                snapshots.forEach((snapshot) => {
                    allSnapshots.push({ ...snapshot, projectId });
                });
            }
        }

        return allSnapshots;
    }

    /**
     * Update a project snapshot
     */
    async updateSnapshot(
        householdId: string,
        projectId: string,
        snapshotId: string,
        updates: Partial<Omit<ProjectSnapshot, 'id' | 'createdAt'>>
    ): Promise<void> {
        const docRef = this.getSnapshotDocRef(householdId, projectId, snapshotId);

        const processedUpdates = { ...updates } as DocumentData;
        Object.keys(processedUpdates).forEach((key) => {
            if (processedUpdates[key] instanceof Date) {
                processedUpdates[key] = Timestamp.fromDate(processedUpdates[key]);
            }
        });

        await updateDoc(docRef, processedUpdates);
    }

    /**
     * Delete a project snapshot
     */
    async deleteSnapshot(
        householdId: string,
        projectId: string,
        snapshotId: string
    ): Promise<void> {
        await deleteDoc(this.getSnapshotDocRef(householdId, projectId, snapshotId));
    }

    /**
     * Batch get snapshots for a specific period across all projects
     */
    async getSnapshotsForPeriod(
        householdId: string,
        year: number,
        month: number
    ): Promise<Array<ProjectSnapshot & { projectId: string }>> {
        // First, get all projects
        const projects = await this.getAll(householdId);
        const projectIds = projects.map((p) => p.id);

        const allSnapshots: Array<ProjectSnapshot & { projectId: string }> = [];

        // Get snapshots for each project
        for (const projectId of projectIds) {
            const snapshots = await this.getSnapshots(householdId, projectId, { year, month });
            snapshots.forEach((snapshot) => {
                allSnapshots.push({ ...snapshot, projectId });
            });
        }

        return allSnapshots;
    }
}

export const projectRepository = new ProjectRepository();
