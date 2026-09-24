import { DebtType } from '@/domains/debt/schemas';

/**
 * Display labels for debt types. Single source of the wording (ADR-0062 rule 7,
 * `CONTEXT.md` Display Label): UI reads labels from `constants`, never from `@/domains`.
 */
export const DebtTypeLabels: Record<DebtType, string> = {
  mortgage: '房貸',
  loan: '信貸',
};

export const DebtTypeOptions = DebtType.options.map((value) => ({
  value,
  label: DebtTypeLabels[value],
}));
