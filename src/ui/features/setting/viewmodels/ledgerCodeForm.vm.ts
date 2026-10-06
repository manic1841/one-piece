import { z } from 'zod';

import { SettingsLedgerCodeLabels } from '@/ui/constants/setting/settingsLabels';

/**
 * Add-custom-ledger-code form. The `code` field carries only the slug suffix;
 * the full code (`type:slug`) is assembled at submit and validated by the
 * domain rules (`validateNewLedgerCode`), which stay the authority for shape,
 * duplicates and parent existence.
 */
export const LedgerCodeFormSchema = z.object({
  type: z.string().min(1),
  code: z.string().trim().min(1, SettingsLedgerCodeLabels.errorCodeRequired),
  label: z.string().trim().min(1, SettingsLedgerCodeLabels.errorLabelRequired),
});

export type LedgerCodeFormVM = z.output<typeof LedgerCodeFormSchema>;

export const createDefaultLedgerCodeFormVM = (): LedgerCodeFormVM => ({
  type: 'expense',
  code: '',
  label: '',
});
