import {
  Firestore,
  DocumentReference,
  CollectionReference,
  type DocumentData,
  Timestamp,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  QueryConstraint,
  serverTimestamp,
  Transaction,
} from 'firebase/firestore';

export abstract class BaseRepository<
  TDomain extends object,
  TFirestore extends DocumentData,
  RefArgs extends unknown[],
> {
  constructor(db: Firestore) {
    this.db = db;
  }
  protected db: Firestore;
  protected abstract getCollectionRef(...args: RefArgs): CollectionReference<DocumentData>;
  protected abstract getDocRef(...args: RefArgs): DocumentReference<DocumentData>;
  protected abstract toFirestore(entity: TDomain): TFirestore;
  protected abstract fromFirestore(data: TFirestore): TDomain;

  // 用來處理日期轉換
  private sanitizeForFirestore(value: unknown): unknown {
    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeForFirestore(v));
    }

    if (value && typeof value === 'object') {
      const output: Record<string, unknown> = {};
      const blocked = new Set(this.getBlockedUpdateFields());

      for (const [key, val] of Object.entries(value)) {
        if (blocked.has(key as keyof TDomain)) continue;
        if (val !== undefined) {
          output[key] = this.sanitizeForFirestore(val);
        }
      }
      return output;
    }

    return value;
  }

  // 可選：用來定義哪些欄位禁止更新
  protected getBlockedUpdateFields(): (keyof TDomain)[] {
    return ['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'] as (keyof TDomain)[];
  }

  // create
  async create(
    args: RefArgs,
    data: Omit<TDomain, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<string> {
    const docRef = this.getCollectionRef(...args);
    const id = docRef.id;

    const payload = this.toFirestore({
      ...data,
      id: id,
      createdBy: userEmail,
      updatedBy: userEmail,
    } as TDomain);

    const sanitized = this.sanitizeForFirestore({
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }) as TFirestore;

    if (tx) {
      tx.set(doc(docRef), sanitized);
    } else {
      await addDoc(docRef, sanitized);
    }
    return id;
  }

  // get
  async get(args: RefArgs, tx?: Transaction): Promise<TDomain | null> {
    const ref = this.getDocRef(...args);
    const snap = tx ? await tx.get(ref) : await getDoc(ref);

    if (!snap.exists()) return null;

    return this.fromFirestore(snap.data() as TFirestore);
  }

  // list
  async list(args: RefArgs, constraints: QueryConstraint[] = []): Promise<TDomain[]> {
    const q = query(this.getCollectionRef(...args), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => this.fromFirestore(doc.data() as TFirestore));
  }

  // update
  async update<K extends keyof TDomain>(
    args: RefArgs,
    updates: Partial<Pick<TDomain, K>>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<void> {
    const docRef = this.getDocRef(...args);

    const payload = this.toFirestore({
      ...updates,
      updatedBy: userEmail,
    } as TDomain);

    const sanitized = this.sanitizeForFirestore({
      ...payload,
      updatedAt: serverTimestamp(),
    }) as TFirestore;

    if (tx) {
      tx.update(docRef, sanitized);
    } else {
      await updateDoc(docRef, sanitized);
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
