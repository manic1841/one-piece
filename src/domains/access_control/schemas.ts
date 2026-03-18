import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

export const AccessControlWhitelistSchema = BaseSchema.extend({
  emails: z.array(z.string().email()),
});
