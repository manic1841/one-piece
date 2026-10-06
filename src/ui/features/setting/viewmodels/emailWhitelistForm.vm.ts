import { z } from 'zod';

import { SettingsWhitelistLabels } from '@/ui/constants/setting/settingsLabels';

import { EMAIL_PATTERN } from './emailField';

/**
 * Add-whitelist-email form. Presence, shape and normalisation (trim +
 * lowercase) move into the schema; the duplicate check stays a submit-time root
 * error because it depends on the current whitelist.
 */
export const EmailWhitelistFormSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, SettingsWhitelistLabels.errorEmailRequired)
    .regex(EMAIL_PATTERN, SettingsWhitelistLabels.errorEmailInvalid),
});

export type EmailWhitelistFormVM = z.output<typeof EmailWhitelistFormSchema>;

export const createDefaultEmailWhitelistFormVM = (): EmailWhitelistFormVM => ({ email: '' });
