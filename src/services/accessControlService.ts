import { accessControlRepository } from '../repositories/accessControlRepository';

const ADMIN_UID = 'rnSCoxeAl0bmc9NQeHSzFR5gYUB3';

export const accessControlService = {
  // Check if user is admin
  isAdmin(uid: string): boolean {
    return uid === ADMIN_UID;
  },

  // Get whitelisted emails
  async getWhitelist(): Promise<string[]> {
    const config = await accessControlRepository.get([]);
    return config?.whitelistedEmails || [];
  },

  // Add email to whitelist (admin only)
  async addEmailToWhitelist(email: string, adminUid: string): Promise<void> {
    if (!this.isAdmin(adminUid)) {
      throw new Error('Only admin can modify whitelist');
    }
    const config = await accessControlRepository.get([]);
    return await accessControlRepository.update(
      [],
      {
        whitelistedEmails: [...(config?.whitelistedEmails || []), email.toLowerCase().trim()],
      },
      email,
    );
  },

  // Remove email from whitelist (admin only)
  async removeEmailFromWhitelist(email: string, adminUid: string): Promise<void> {
    if (!this.isAdmin(adminUid)) {
      throw new Error('Only admin can modify whitelist');
    }
    const config = await accessControlRepository.get([]);
    return await accessControlRepository.update(
      [],
      {
        whitelistedEmails: config?.whitelistedEmails?.filter(
          (e) => e !== email.toLowerCase().trim(),
        ),
      },
      email,
    );
  },

  // Check if user is authorized (admin or whitelisted)
  async isUserAuthorized(uid: string, email: string | null): Promise<boolean> {
    // Admin is always authorized
    if (this.isAdmin(uid)) {
      return true;
    }

    // Check whitelist
    if (!email) {
      return false;
    }

    const whitelist = await this.getWhitelist();
    return whitelist.includes(email.toLowerCase().trim());
  },
};
