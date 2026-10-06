import { z } from 'zod';

import { SettingsHouseholdLabels } from '@/ui/constants/setting/settingsLabels';

import { EMAIL_PATTERN } from './emailField';
import { RoleEnum } from './setting.vm';

/**
 * Add-member form. Presence and email shape move into the schema — the previous
 * native `required` + `type="email"` are gone now that the form is `noValidate`
 * (behaviour-preserving: the same two checks, enforced by the gate instead). The
 * email is intentionally NOT lowercased (the prior implementation passed it
 * through as typed).
 */
export const MemberFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, SettingsHouseholdLabels.errorEmailRequired)
    .regex(EMAIL_PATTERN, SettingsHouseholdLabels.errorEmailInvalid),
  role: z.string().min(1),
});

export type MemberFormVM = z.output<typeof MemberFormSchema>;

export const createDefaultMemberFormVM = (): MemberFormVM => ({
  email: '',
  role: RoleEnum.MEMBER,
});
