import { z } from 'zod';

export const AccessControlWhitelistSchema = z.object({
  emails: z.array(z.string().email()),
});
