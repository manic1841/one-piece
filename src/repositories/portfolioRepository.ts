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
  type DocumentData,
  type WithFieldValue,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  PortfolioSchema,
  PortfolioSnapshotSchema,
  type Portfolio,
  type PortfolioSnapshot,
} from '../schemas';

class PortfolioRepository {
  private readonly collectionName = 'portfolios';
  private readonly snapshotCollectionName = 'snapshots';

  private getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, portfolioId: string) {
    return doc(db, 'households', householdId, this.collectionName, portfolioId);
  }

  private getSnapshotCollectionRef(householdId: string, portfolioId: string) {
    return collection(
      db,
      'households',
      householdId,
      this.collectionName,
      portfolioId,
      this.snapshotCollectionName,
    );
  }

  private parse(data: DocumentData): Portfolio {
    return PortfolioSchema.parse(data);
  }

  private parseSnapshot(data: DocumentData): PortfolioSnapshot {
    return PortfolioSnapshotSchema.parse(data);
  }

  async create(
    householdId: string,
    data: WithFieldValue<Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<string> {
    const docRef = doc(this.getCollectionRef(householdId));
    const id = docRef.id;

    const newPortfolio = {
      ...data,
      id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, newPortfolio as WithFieldValue<DocumentData>);
    return id;
  }

  async getById(householdId: string, portfolioId: string): Promise<Portfolio | null> {
    const docSnap = await getDoc(this.getDocRef(householdId, portfolioId));
    if (docSnap.exists()) {
      return this.parse(docSnap.data());
    }
    return null;
  }

  async getAll(householdId: string, constraints: QueryConstraint[] = []): Promise<Portfolio[]> {
    const q = query(this.getCollectionRef(householdId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parse(doc.data()));
  }

  async update(
    householdId: string,
    portfolioId: string,
    updates: WithFieldValue<Partial<Omit<Portfolio, 'id' | 'createdAt'>>>,
  ): Promise<void> {
    const docRef = this.getDocRef(householdId, portfolioId);
    const processedUpdates = {
      ...updates,
      updatedAt: serverTimestamp(),
    } as DocumentData;

    await updateDoc(docRef, processedUpdates);
  }

  async delete(householdId: string, portfolioId: string): Promise<void> {
    await deleteDoc(this.getDocRef(householdId, portfolioId));
  }

  // Snapshot operations
  async createSnapshot(
    householdId: string,
    portfolioId: string,
    data: WithFieldValue<Omit<PortfolioSnapshot, 'id' | 'createdAt'>>,
  ): Promise<string> {
    const docRef = doc(this.getSnapshotCollectionRef(householdId, portfolioId));
    const id = docRef.id;

    const newSnapshot = {
      ...data,
      id,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, newSnapshot as WithFieldValue<DocumentData>);
    return id;
  }

  async getSnapshots(
    householdId: string,
    portfolioId: string,
    constraints: QueryConstraint[] = [],
  ): Promise<PortfolioSnapshot[]> {
    const q = query(this.getSnapshotCollectionRef(householdId, portfolioId), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => this.parseSnapshot(doc.data()));
  }
}

export const portfolioRepository = new PortfolioRepository();
