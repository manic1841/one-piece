import { z } from 'zod';

import { SettingsHouseholdLabels } from '@/ui/constants/setting/settingsLabels';

import { emailField } from './emailField';
import { RoleEnum } from './setting.vm';

/**
 * Add-member form. Presence and email shape move into the schema — the previous
 * native `required` + `type="email"` are gone now that the form is `noValidate`
 * (behaviour-preserving: the same two checks, enforced by the gate instead).
 */
export const MemberFormSchema = z.object({
  email: emailField(
    SettingsHouseholdLabels.errorEmailRequired,
    SettingsHouseholdLabels.errorEmailInvalid,
  ),
  role: z.string().min(1),
});

export type MemberFormVM = z.output<typeof MemberFormSchema>;

export const createDefaultMemberFormVM = (): MemberFormVM => ({
  email: '',
  role: RoleEnum.MEMBER,
});
