import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AccessControlSchema, parseWithSchemaOptional } from '../schemas';

class AccessControlRepository {
  private readonly collectionName = 'access_control';
  private readonly docId = 'config';

  private getDocRef() {
    return doc(db, this.collectionName, this.docId);
  }

  async getWhitelist(): Promise<string[]> {
    try {
      const docSnap = await getDoc(this.getDocRef());

      if (docSnap.exists()) {
        const data = docSnap.data();
        const accessControl = parseWithSchemaOptional(AccessControlSchema, data);
        return accessControl?.whitelistedEmails || [];
      }

      return [];
    } catch (error) {
      console.error('Error getting whitelist:', error);
      return [];
    }
  }

  async addEmailToWhitelist(email: string, adminUid: string): Promise<void> {
    const docRef = this.getDocRef();
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        whitelistedEmails: arrayUnion(email.toLowerCase().trim()),
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
      });
    } else {
      await setDoc(docRef, {
        whitelistedEmails: [email.toLowerCase().trim()],
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
      });
    }
  }

  async removeEmailFromWhitelist(email: string, adminUid: string): Promise<void> {
    const docRef = this.getDocRef();
    await updateDoc(docRef, {
      whitelistedEmails: arrayRemove(email.toLowerCase().trim()),
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    });
  }
}

export const accessControlRepository = new AccessControlRepository();
