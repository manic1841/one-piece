import {
  Firestore,
  DocumentReference,
  CollectionReference,
  type DocumentData,
  setDoc,
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

export type ExcludedColumn = 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy';

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
  protected abstract toFirestore(entity: TDomain): Partial<TFirestore>;
  protected abstract fromFirestore(data: TFirestore): TDomain;

  // create
  async create(
    args: RefArgs,
    data: Omit<TDomain, ExcludedColumn>,
    userEmail: string,
    tx?: Transaction,
  ): Promise<string> {
    const docRef = doc(this.getCollectionRef(...args));
    const id = docRef.id;

    const sanitized = this.toFirestore({
      ...data,
      id: id,
      createdBy: userEmail,
      updatedBy: userEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TDomain);

    const payload = {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (tx) {
      tx.set(docRef, payload);
    } else {
      await setDoc(docRef, payload);
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

    const sanitized = this.toFirestore({
      ...updates,
      updatedBy: userEmail,
      updatedAt: new Date(),
    } as TDomain);

    const payload = {
      ...sanitized,
      updatedAt: serverTimestamp(),
    };

    if (tx) {
      tx.update(docRef, payload);
    } else {
      await updateDoc(docRef, payload);
    }
  }

  // delete
  async delete(args: RefArgs, tx?: Transaction): Promise<void> {
    console.log('delete handle', args);
    if (tx) {
      tx.delete(this.getDocRef(...args));
    } else {
      await deleteDoc(this.getDocRef(...args));
    }
  }
}
