import { accessControlRepository } from '@/repositories/accessControlRepository';

export const accessControlService = {
  // Get whitelisted emails
  async getWhitelist(): Promise<string[]> {
    const whitelist = await accessControlRepository.getWhitelist();
    return whitelist?.emails || [];
  },

  // Add email to whitelist (admin only)
  async addEmailToWhitelist(email: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) {
      throw new Error('Only admin can modify whitelist');
    }
    const whitelist = await accessControlRepository.getWhitelist();
    if (whitelist?.emails.includes(email.toLowerCase().trim())) {
      return;
    }
    return await accessControlRepository.saveWhitelist({
      emails: [...(whitelist?.emails || []), email.toLowerCase().trim()],
    });
  },

  // Remove email from whitelist (admin only)
  async removeEmailFromWhitelist(email: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) {
      throw new Error('Only admin can modify whitelist');
    }
    const whitelist = await accessControlRepository.getWhitelist();
    if (!whitelist?.emails.includes(email.toLowerCase().trim())) {
      return;
    }
    return await accessControlRepository.saveWhitelist({
      emails: whitelist?.emails?.filter((e) => e !== email.toLowerCase().trim()),
    });
  },

  // Check if user is authorized (admin or whitelisted)
  async isUserAuthorized(email: string | null): Promise<boolean> {
    // Check whitelist
    if (!email) {
      return false;
    }

    const whitelist = await this.getWhitelist();
    return whitelist.includes(email.toLowerCase().trim());
  },
};
