import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type WithFieldValue,
} from 'firebase/firestore';
import { db } from '../firebase';
import { z } from 'zod';

// Generic type for entities that have an ID and optional createdAt
export interface BaseEntity {
  id: string;
  createdAt?: Date | Timestamp;
}

export class BaseService<T extends BaseEntity> {
  protected collectionName: string;
  protected schema: z.ZodType<T>;

  constructor(collectionName: string, schema: z.ZodType<T>) {
    this.collectionName = collectionName;
    this.schema = schema;
  }

  protected getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, id: string) {
    return doc(db, 'households', householdId, this.collectionName, id);
  }

  // Helper to parse data with Zod schema
  protected parseData(data: DocumentData): T {
    // Handle Timestamp conversion if needed, though Zod usually handles it if configured correctly
    // or if the schema expects Date | Timestamp
    return this.schema.parse(data);
  }

  async create(householdId: string, data: Omit<T, 'id' | 'createdAt'>): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    const newData = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    // We need to cast to WithFieldValue<DocumentData> because generic T is hard for Firestore types
    await setDoc(docRef, newData as WithFieldValue<DocumentData>);
    return id;
  }

  async getAll(householdId: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => this.parseData(doc.data()));
  }

  async getById(householdId: string, id: string): Promise<T | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, id));

    if (docSnap.exists()) {
      return this.parseData(docSnap.data());
    }
    return null;
  }

  async update(householdId: string, id: string, updates: Partial<T>): Promise<void> {
    const docRef = this.getDocRef(householdId, id);

    // Convert Date objects to Timestamps for Firestore
    const processedUpdates = { ...updates } as DocumentData;
    Object.keys(processedUpdates).forEach((key) => {
      if (processedUpdates[key] instanceof Date) {
        processedUpdates[key] = Timestamp.fromDate(processedUpdates[key]);
      }
    });

    await updateDoc(docRef, processedUpdates);
  }

  async delete(householdId: string, id: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, id));
  }
}
