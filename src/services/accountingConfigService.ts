import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { BaseService } from './baseService';
import {
  AccountingConfigSchema,
  type AccountingConfig,
  type AccountingCategory,
} from '../schemas/accountingConfig';

class AccountingConfigService extends BaseService<AccountingConfig> {
  constructor() {
    super('accountingConfig', AccountingConfigSchema);
  }

  /**
   * Get configuration for a household
   * Since there's only one config per household, we use householdId as the document ID
   */
  async getConfig(householdId: string): Promise<AccountingConfig | null> {
    try {
      const docRef = doc(this.getCollectionRef(householdId), 'default');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return AccountingConfigSchema.parse({
          ...docSnap.data(),
          id: docSnap.id,
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching accounting config:', error);
      throw error;
    }
  }

  /**
   * Create or update configuration
   */
  async saveConfig(
    householdId: string,
    mappings: Record<string, AccountingCategory>,
    createdBy: string,
  ): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(householdId), 'default');
      const docSnap = await getDoc(docRef);

      const data = {
        householdId,
        projectMappings: mappings,
        updatedAt: serverTimestamp(),
        createdBy, // Update createdBy on edit? Or keep original? Usually update last modifier.
      };

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(docRef, data, { merge: true });
      }
    } catch (error) {
      console.error('Error saving accounting config:', error);
      throw error;
    }
  }

  /**
   * Get projects mapped to a specific category
   */
  async getProjectsByCategory(
    householdId: string,
    category: AccountingCategory,
  ): Promise<string[]> {
    const config = await this.getConfig(householdId);
    if (!config) return [];

    return Object.entries(config.projectMappings)
      .filter(([, cat]) => cat === category)
      .map(([projectId]) => projectId);
  }
}

export const accountingConfigService = new AccountingConfigService();
