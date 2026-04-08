import { collection, doc, getDoc, setDoc } from 'firebase/firestore';

import { AccessControlWhitelistSchema } from '@/domains/access_control/schemas';
import { type AccessControlWhitelist } from '@/domains/access_control/types';
import { db } from '@/firebase';

class AccessControlRepository {
  private readonly db = db;
  private readonly collectionName = 'access_control';
  private readonly whitelistDocId = 'whitelist';

  private getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  private getDocRef(docId: string = this.whitelistDocId) {
    return doc(this.getCollectionRef(), docId);
  }

  async getWhitelist(): Promise<AccessControlWhitelist | null> {
    const snap = await getDoc(this.getDocRef(this.whitelistDocId));
    if (!snap.exists()) return null;

    const raw = snap.data();
    return AccessControlWhitelistSchema.parse({
      emails: Array.isArray(raw.emails) ? raw.emails.filter((e) => typeof e === 'string') : [],
    });
  }

  async saveWhitelist(data: AccessControlWhitelist): Promise<void> {
    await setDoc(this.getDocRef(this.whitelistDocId), AccessControlWhitelistSchema.parse(data));
  }
}

export const accessControlRepository = new AccessControlRepository();
