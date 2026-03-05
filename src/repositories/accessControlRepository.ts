import { Firestore, collection, doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import { type AccessControlWhitelist, AccessControlWhitelistSchema } from '@/schemas';

class AccessControlRepository {
  constructor(db: Firestore) {
    this.db = db;
  }
  protected db: Firestore;
  private readonly collectionName = 'access_control';
  private readonly whitelistDocId = 'whitelist';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(name: string) {
    return doc(this.getCollectionRef(), name);
  }

  async saveWhitelist(whitelist: AccessControlWhitelist) {
    const docRef = this.getDocRef(this.whitelistDocId);
    const data = AccessControlWhitelistSchema.parse(whitelist);
    await setDoc(docRef, data);
  }

  async getWhitelist() {
    const docRef = this.getDocRef(this.whitelistDocId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return AccessControlWhitelistSchema.parse(snap.data());
  }
}

export const accessControlRepository = new AccessControlRepository(db);
