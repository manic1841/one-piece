import { z } from 'zod';

import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';

export type OpeningNetWorthSource = 'derived' | 'manual';

export interface OpeningNetWorthVM {
  source: OpeningNetWorthSource;
  /** Raw field value; kept as a string at the field boundary. */
  amountText: string;
  /** Only present while the value is derived. */
  anchorYearMonth: string | null;
}

export interface ReportValue {
  amountText: string;
  anchorYearMonth: string;
}

export interface WorkspaceDraft {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  events: LifeEvent[];
  startYear: number;
  opening: OpeningNetWorthVM;
  reportValue: ReportValue | null;
}

export const EMPTY_OPENING: OpeningNetWorthVM = {
  source: 'derived',
  amountText: '',
  anchorYearMonth: null,
};

export const openingSchema = z
  .object({
    source: z.enum(['derived', 'manual']),
    amountText: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.source !== 'manual') return;
    const text = value.amountText.trim();
    const amount = Number(text);
    if (text === '' || !Number.isInteger(amount)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountText'], message: 'INVALID' });
    }
  });

export const startYearSchema = z.number().int();
