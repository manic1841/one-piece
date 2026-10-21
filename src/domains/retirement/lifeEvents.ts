import { z } from 'zod';

import { RetirementSchemaErrorCode } from './errorCodes';
import { addIssue, hasMoreThanFourDecimalPlaces } from './numeric';

const YEAR_MIN = 1900;
const YEAR_MAX = 2200;

function phaseYearField() {
  return z.number().superRefine((value, ctx) => {
    if (!Number.isInteger(value) || value < YEAR_MIN || value > YEAR_MAX) {
      addIssue(ctx, RetirementSchemaErrorCode.PHASE_YEAR_OUT_OF_RANGE, [], {
        min: YEAR_MIN,
        max: YEAR_MAX,
      });
    }
  });
}

const growthRateField = z.number().superRefine((value, ctx) => {
  if (value < -0.1 || value > 0.2) {
    addIssue(ctx, RetirementSchemaErrorCode.GROWTH_RATE_OUT_OF_RANGE, [], {
      min: -0.1,
      max: 0.2,
    });
  }
  if (hasMoreThanFourDecimalPlaces(value)) {
    addIssue(ctx, RetirementSchemaErrorCode.GROWTH_RATE_TOO_MANY_DECIMAL_PLACES, [], {
      maxDecimalPlaces: 4,
    });
  }
});

export const LifeEventPhaseSchema = z
  .object({
    name: z.string().trim().min(1, RetirementSchemaErrorCode.PHASE_NAME_BLANK).optional(),
    startYear: phaseYearField(),
    endYear: phaseYearField(),
    amount: z.number().superRefine((value, ctx) => {
      if (value < 0) {
        addIssue(ctx, RetirementSchemaErrorCode.AMOUNT_NEGATIVE, [], { min: 0 });
      }
    }),
    growthRate: growthRateField.optional(),
  })
  .superRefine((phase, ctx) => {
    if (phase.endYear < phase.startYear) {
      addIssue(ctx, RetirementSchemaErrorCode.PHASE_END_BEFORE_START, ['endYear'], {
        startYear: phase.startYear,
        endYear: phase.endYear,
      });
    }
  });
export type LifeEventPhase = z.infer<typeof LifeEventPhaseSchema>;

export const LifeEventSchema = z
  .object({
    id: z.string().trim().min(1, RetirementSchemaErrorCode.EVENT_ID_REQUIRED),
    name: z.string().trim().min(1, RetirementSchemaErrorCode.EVENT_NAME_REQUIRED),
    type: z.enum(['income', 'expense'], {
      error: RetirementSchemaErrorCode.EVENT_TYPE_INVALID,
    }),
    enabled: z.boolean().default(true),
    phases: z.array(LifeEventPhaseSchema).min(1, RetirementSchemaErrorCode.PHASES_REQUIRED),
  })
  .superRefine((event, ctx) => {
    for (let index = 1; index < event.phases.length; index += 1) {
      const previous = event.phases[index - 1];
      const current = event.phases[index];

      if (current.startYear < previous.startYear) {
        addIssue(ctx, RetirementSchemaErrorCode.PHASES_NOT_SORTED, [index, 'startYear'], {
          phaseIndex: index,
          previousStartYear: previous.startYear,
        });
      }

      if (current.startYear <= previous.endYear) {
        addIssue(ctx, RetirementSchemaErrorCode.PHASES_OVERLAP, [index, 'startYear'], {
          phaseIndex: index,
          year: current.startYear,
        });
      }
    }
  });
export type LifeEvent = z.infer<typeof LifeEventSchema>;

export const LifeEventsSchema = z.array(LifeEventSchema);
