import { useState } from 'react';

interface UseRetirementDialogFormOptions {
  /**
   * Re-seeds the form fields when the dialog opens. Called from the open
   * handler, never from an effect: the reset is a user action, not a reaction
   * to state (see `react-hooks/set-state-in-effect`).
   */
  resetOnOpen: () => void;
}

/**
 * Shared shell for the retirement entry dialogs: the open/loading flags plus
 * the "opening the dialog reseeds the form" rule.
 *
 * Field state itself belongs to each dialog's Controller (ADR-0064) — this hook
 * owns nothing the form owns, so it stays free of RHF.
 */
export function useRetirementDialogForm({ resetOnOpen }: UseRetirementDialogFormOptions) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetOpen = (value: boolean) => {
    if (value) resetOnOpen();
    setOpen(value);
  };

  return { open, setOpen: handleSetOpen, loading, setLoading };
}

export interface RetirementGrowthLabels {
  usingPlanInflation: (rate: number) => string;
  growthPercent: (rate: number) => string;
}

export interface RetirementDurationLabels {
  lifelong: string;
  until: (endYear: string) => string;
}

/**
 * Derived readout: how the entry's growth will behave. A blank input means
 * "follow plan inflation", an explicit `0` means no growth. The form only holds
 * what the user typed — the readout is derived, never an RHF field.
 */
export const deriveRetirementGrowthText = (
  growthRate: string | number | undefined,
  planInflationRate: number,
  labels: RetirementGrowthLabels,
): string =>
  growthRate === '' || growthRate === undefined
    ? labels.usingPlanInflation(planInflationRate)
    : labels.growthPercent(Number(growthRate));

/** Derived readout: how long the entry lasts. See {@link deriveRetirementGrowthText}. */
export const deriveRetirementDurationText = (
  { lifelong, endYear }: { lifelong?: boolean; endYear?: string | number },
  labels: RetirementDurationLabels,
): string =>
  lifelong || endYear === '' || endYear === undefined
    ? labels.lifelong
    : labels.until(String(endYear));
