import { getWhitelistUseCase } from './getWhitelistUseCase';
import { updateWhitelistUseCase } from './updateWhitelistUseCase';

export class AddWhitelistEmailUseCase {
  async execute(email: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) throw new Error('Only admin can modify whitelist');

    const currentWhitelist = await getWhitelistUseCase.execute();
    const emails = currentWhitelist?.emails || [];
    const normalizedEmail = email.toLowerCase().trim();

    if (emails.includes(normalizedEmail)) return;

    await updateWhitelistUseCase.execute({ emails: [...emails, normalizedEmail] });
  }
}

export const addWhitelistEmailUseCase = new AddWhitelistEmailUseCase();
