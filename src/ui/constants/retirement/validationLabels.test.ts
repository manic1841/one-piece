import { describe, expect, it } from 'vitest';

import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';

import { RETIREMENT_VALIDATION_LABELS } from './validationLabels';

describe('retirement validation labels', () => {
  it('has exactly one label per error code', () => {
    expect(Object.keys(RETIREMENT_VALIDATION_LABELS).sort()).toEqual(
      Object.keys(RetirementSchemaErrorCode).sort(),
    );
  });

  it('has a non-blank label for every code', () => {
    for (const label of Object.values(RETIREMENT_VALIDATION_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
