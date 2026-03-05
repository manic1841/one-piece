import {
  CollectionReference,
  type DocumentData,
  DocumentReference,
  Firestore,
  QueryConstraint,
  Timestamp,
  Transaction,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { z } from 'zod';

import { type Base } from '@/schemas';

export type ExcludedColumn = 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy';

export abstract class BaseRepository<TDomain extends Base, RefArgs extends unknown[] = []> {
  constructor(db: Firestore) {
    this.db = db;
  }
  protected db: Firestore;
  protected abstract getCollectionRef(...args: RefArgs): CollectionReference<DocumentData>;
  protected abstract getDocRef(...args: RefArgs): DocumentReference<DocumentData>;

  protected abstract getDomainSchema(): z.ZodType<Base>;

  protected convertDateToTimestamp(value: unknown): unknown {
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.convertDateToTimestamp(item));
    }

    if (value && typeof value === 'object') {
      const convertedObject: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        convertedObject[key] = this.convertDateToTimestamp(val);
      }
      return convertedObject;
    }

    return value;
  }

  protected convertTimestampToDate(value: unknown): unknown {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.convertTimestampToDate(item));
    }
    if (value && typeof value === 'object') {
      const convertedObject: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        convertedObject[key] = this.convertTimestampToDate(val);
      }
      return convertedObject;
    }
    return value;
  }

  protected convertToFirestore(entity: TDomain): Partial<DocumentData> {
    const { createdAt, updatedAt, ...rest } = entity;

    const payload = this.convertDateToTimestamp(rest) as Partial<DocumentData>;

    return {
      ...payload,
      createdAt: createdAt ? Timestamp.fromDate(createdAt) : serverTimestamp(),
      updatedAt: updatedAt ? Timestamp.fromDate(updatedAt) : serverTimestamp(),
    } as Partial<DocumentData>;
  }

  protected convertFromFirestore(data: DocumentData): TDomain {
    const { createdAt, updatedAt, ...rest } = data;

    const payload = this.convertTimestampToDate(rest) as Partial<TDomain>;

    return {
      ...payload,
      createdAt: createdAt ? createdAt.toDate() : new Date(),
      updatedAt: updatedAt ? updatedAt.toDate() : new Date(),
    } as unknown as TDomain;
  }

  protected sanitize(value: unknown): unknown {
    if (value === undefined) return undefined;

    if (value instanceof Date) return value;

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item)).filter((item) => item !== undefined);
    }

    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value)
        .map(([k, v]) => [k, this.sanitize(v)] as const)
        .filter(([, v]) => v !== undefined);

      return Object.fromEntries(entries);
    }

    return value;
  }

  // create
  async create(
    args: RefArgs,
    data: Omit<TDomain, ExcludedColumn>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<string> {
    const docRef = doc(this.getCollectionRef(...args));
    const id = docRef.id;

    const sanitized = this.sanitize(data as TDomain) as TDomain;

    const entity = this.convertToFirestore({
      ...sanitized,
      id: id,
      createdBy: userEmail,
      updatedBy: userEmail,
    } as TDomain);

    if (tx) {
      tx.set(docRef, entity);
    } else {
      await setDoc(docRef, entity);
    }
    return id;
  }

  // get
  async get(args: RefArgs, tx?: Transaction): Promise<TDomain | null> {
    const ref = this.getDocRef(...args);
    const snap = tx ? await tx.get(ref) : await getDoc(ref);

    if (!snap.exists()) return null;

    return this.convertFromFirestore(snap.data());
  }

  // list
  async list(args: RefArgs, constraints: QueryConstraint[] = []): Promise<TDomain[]> {
    const q = query(this.getCollectionRef(...args), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => this.convertFromFirestore(doc.data()));
  }

  // update
  async update<K extends keyof TDomain>(
    args: RefArgs,
    updates: Partial<Pick<TDomain, K>>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<void> {
    const docRef = this.getDocRef(...args);

    // remove undefined fields
    const sanitized = this.sanitize(updates as TDomain) as Partial<TDomain>;

    const payload = this.convertToFirestore({
      ...sanitized,
      updatedBy: userEmail,
    } as TDomain);

    if (tx) {
      tx.update(docRef, payload);
    } else {
      await updateDoc(docRef, payload);
    }
  }

  // delete
  async delete(args: RefArgs, tx?: Transaction): Promise<void> {
    if (tx) {
      tx.delete(this.getDocRef(...args));
    } else {
      await deleteDoc(this.getDocRef(...args));
    }
  }
}
