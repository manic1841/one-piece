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

import { fromFirestore, sanitize, toFirestore } from '@/infra/repositories/firestorePayload';
import { type Base } from '@/shared/schemas/base';

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
    return toFirestore(value);
  }

  protected convertTimestampToDate(value: unknown): unknown {
    return fromFirestore(value as DocumentData);
  }

  protected convertToFirestore(entity: TDomain): Partial<DocumentData> {
    const { createdAt, updatedAt, ...rest } = entity;

    const payload = this.convertDateToTimestamp(rest) as Partial<DocumentData>;

    // Not redundant: a normal create/update omits `createdAt` (the signature is
    // `Omit<TDomain, ExcludedColumn>`) so the server clock fills it, while a
    // backup restore carries the original instant and must keep it.
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

  /** Delegates: `firestorePayload` is the one home of the payload rules. */
  protected sanitize(value: unknown): unknown {
    return sanitize(value);
  }

  // create
  async create(
    args: RefArgs,
    data: Omit<TDomain, ExcludedColumn>,
    userEmail: string,
    tx?: Transaction,
    customId?: string,
  ): Promise<string> {
    const docRef = customId
      ? doc(this.getCollectionRef(...args), customId)
      : doc(this.getCollectionRef(...args));
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

  /**
   * Deterministic upsert: writes to a known doc ID without a prior read.
   * Uses setDoc with merge so existing fields (e.g. createdAt) are preserved
   * on overwrite, and serverTimestamp fills them on first create.
   */
  async set(
    args: RefArgs,
    data: Omit<TDomain, ExcludedColumn>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<void> {
    const docRef = this.getDocRef(...args);

    const sanitized = this.sanitize(data as TDomain) as TDomain;

    const entity = this.convertToFirestore({
      ...sanitized,
      id: docRef.id,
      createdBy: userEmail,
      updatedBy: userEmail,
    } as TDomain);

    if (tx) {
      tx.set(docRef, entity, { merge: true });
    } else {
      await setDoc(docRef, entity, { merge: true });
    }
  }

  // get
  async get(args: RefArgs, tx?: Transaction): Promise<TDomain | null> {
    const ref = this.getDocRef(...args);
    const snap = tx ? await tx.get(ref) : await getDoc(ref);

    if (!snap.exists()) return null;

    const data = this.convertFromFirestore(snap.data());
    return this.getDomainSchema().parse(data) as TDomain;
  }

  // list
  async list(args: RefArgs, constraints: QueryConstraint[] = []): Promise<TDomain[]> {
    const q = query(this.getCollectionRef(...args), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = this.convertFromFirestore(doc.data());
      return this.getDomainSchema().parse(data) as TDomain;
    });
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
