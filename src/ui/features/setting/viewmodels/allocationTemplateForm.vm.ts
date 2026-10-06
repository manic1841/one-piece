import { z } from 'zod';

import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { SettingsAllocationLabels } from '@/ui/constants/setting/settingsLabels';

/** One allocation row. `percentage` is a string at the field boundary (ADR-0065). */
export const AllocationTemplateFormItemSchema = z.object({
  projectId: z.string(),
  percentage: z.string(),
});

/**
 * Returns the row's percentage when it is a usable positive value, else `null`.
 * Single source of truth for "counts toward 100%" — shared by the schema, the
 * map function, and the live total preview so the three cannot drift.
 */
export const positivePercentage = (raw: string): number | null => {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * Income-allocation-template form. `name`/`ledgerCode` presence is intentionally
 * unconstrained (matching the prior behaviour — the domain create schema only
 * requires the keys to exist). The only added invariant is the same one the
 * transaction allocation repeater enforces: at least one positive row and a
 * total of 100%. Rows that are unparseable or ≤ 0 are excluded from the total
 * and dropped at map time, preserving the previous silent-filter behaviour.
 */
export const AllocationTemplateFormSchema = z
  .object({
    name: z.string(),
    ledgerCode: z.string(),
    isDefault: z.boolean(),
    items: z.array(AllocationTemplateFormItemSchema),
  })
  .superRefine((vm, ctx) => {
    const valid = vm.items
      .map((item) => positivePercentage(item.percentage))
      .filter((value): value is number => value !== null);

    if (valid.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: SettingsAllocationLabels.errorItemsRequired,
      });
      return;
    }

    const total = valid.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['items'],
        message: SettingsAllocationLabels.errorTotal,
      });
    }
  });

export type AllocationTemplateFormVM = z.output<typeof AllocationTemplateFormSchema>;

export const createDefaultAllocationTemplateFormVM = (): AllocationTemplateFormVM => ({
  name: '',
  ledgerCode: '',
  isDefault: false,
  items: [],
});

/** Seeds the form from a persisted template (edit mode). */
export const toAllocationTemplateFormVM = (
  template: AllocationTemplate,
): AllocationTemplateFormVM => ({
  name: template.name,
  ledgerCode: template.ledgerCode,
  isDefault: template.isDefault,
  items: template.items.map((item) => ({
    projectId: item.projectId,
    percentage: String(item.percentage),
  })),
});

/**
 * Maps a parsed VM to the use case's item payload: positive rows only, coerced
 * to number. Mirrors the previous silent filter.
 */
export const mapAllocationTemplateVMToItems = (
  vm: AllocationTemplateFormVM,
): { projectId: string; percentage: number }[] =>
  vm.items
    .map((item) => ({
      projectId: item.projectId,
      percentage: positivePercentage(item.percentage),
    }))
    .filter((item): item is { projectId: string; percentage: number } => item.percentage !== null);
