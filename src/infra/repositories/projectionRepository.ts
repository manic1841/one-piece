import {
  type DocumentData,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  type CreateProjectionAtomicallyInput,
  type ProjectionAnnual,
  ProjectionAnnualSchema,
  type ProjectionConfig,
  ProjectionConfigSchema,
  type ProjectionDocument,
  type ProjectionDocumentName,
  ProjectionDocumentSchema,
  type ProjectionSource,
  ProjectionSourceSchema,
  type ProjectionWriteResult,
} from '@/domains/retirement/logic/projectionDocuments';
import { db } from '@/firebase';
import { fromFirestore, isDocumentTooLarge, sanitize } from '@/infra/repositories/firestorePayload';

export type {
  CreateProjectionAtomicallyInput,
  ProjectionAnnual,
  ProjectionConfig,
  ProjectionDocument,
  ProjectionDocumentName,
  ProjectionSource,
  ProjectionWriteResult,
} from '@/domains/retirement/logic/projectionDocuments';
export { PROJECTION_DOCUMENT_MAX_BYTES } from '@/domains/retirement/logic/projectionDocuments';

class ProjectionRepository {
  private readonly collectionName = 'projections';

  private getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, projectionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, projectionId);
  }

  private getConfigRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'snapshots',
      'config',
    );
  }

  private getSourceRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'snapshots',
      'source',
    );
  }

  private getAnnualRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'results',
      'annual',
    );
  }

  async createProjectionAtomically(
    input: CreateProjectionAtomicallyInput,
  ): Promise<ProjectionWriteResult> {
    const { householdId, projection, config, source, results } = input;

    const projectionRef = doc(this.getCollectionRef(householdId));
    const projectionId = projectionRef.id;

    const mainPayload = sanitize({
      ...projection,
      createdAt: Timestamp.fromDate(projection.createdAt),
    }) as DocumentData;
    const configPayload = sanitize(config) as DocumentData;
    const sourcePayload = sanitize(source) as DocumentData;
    const annualPayload = sanitize(results) as DocumentData;

    const documents: Array<[ProjectionDocumentName, DocumentData]> = [
      ['main', mainPayload],
      ['config', configPayload],
      ['source', sourcePayload],
      ['annual', annualPayload],
    ];

    for (const [document, payload] of documents) {
      if (isDocumentTooLarge(payload)) {
        return { ok: false, code: 'PROJECTION_TOO_LARGE', document };
      }
    }

    const batch = writeBatch(this.db);
    batch.set(projectionRef, mainPayload);
    batch.set(this.getConfigRef(householdId, projectionId), configPayload);
    batch.set(this.getSourceRef(householdId, projectionId), sourcePayload);
    batch.set(this.getAnnualRef(householdId, projectionId), annualPayload);
    await batch.commit();

    return { ok: true, id: projectionId };
  }

  /** Children first, then the main document, in one batch. Hard delete. */
  async deleteProjection(householdId: string, projectionId: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.delete(this.getAnnualRef(householdId, projectionId));
    batch.delete(this.getSourceRef(householdId, projectionId));
    batch.delete(this.getConfigRef(householdId, projectionId));
    batch.delete(this.getDocRef(householdId, projectionId));
    await batch.commit();
  }

  /** The one targeted update: everything else in a projection stays frozen. */
  async renameProjectionName(
    householdId: string,
    projectionId: string,
    name: string,
  ): Promise<void> {
    await updateDoc(this.getDocRef(householdId, projectionId), { name });
  }

  async getProjection(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionDocument | null> {
    const snapshot = await getDoc(this.getDocRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    const parsed = ProjectionDocumentSchema.parse(fromFirestore(snapshot.data()));
    return { ...parsed, id: snapshot.id };
  }

  async listProjections(householdId: string): Promise<ProjectionDocument[]> {
    const snapshot = await getDocs(
      query(this.getCollectionRef(householdId), orderBy('createdAt', 'desc')),
    );

    return snapshot.docs.map((entry) => ({
      ...ProjectionDocumentSchema.parse(fromFirestore(entry.data())),
      id: entry.id,
    }));
  }

  async getProjectionConfig(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionConfig | null> {
    const snapshot = await getDoc(this.getConfigRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return ProjectionConfigSchema.parse(fromFirestore(snapshot.data()));
  }

  async getProjectionSource(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionSource | null> {
    const snapshot = await getDoc(this.getSourceRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return ProjectionSourceSchema.parse(fromFirestore(snapshot.data()));
  }

  async getProjectionAnnual(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionAnnual | null> {
    const snapshot = await getDoc(this.getAnnualRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return ProjectionAnnualSchema.parse(fromFirestore(snapshot.data()));
  }

  protected readonly db = db;
}

export const projectionRepository = new ProjectionRepository();
