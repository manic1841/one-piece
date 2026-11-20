import { type ReactElement } from 'react';

import { type RenderResult, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { type Mock, vi } from 'vitest';

/** One draft group, as a mocked controller reports it. */
export interface DraftGroupMock {
  values: Record<string, unknown>;
  errors: Record<string, unknown>;
  valid: boolean;
  setField: Mock;
}

export const draftGroup = (): DraftGroupMock => ({
  values: {},
  errors: {},
  valid: true,
  setField: vi.fn(),
});

/**
 * The controller surface `RetirementPlanForm` consumes. Pages are the subject of
 * these tests, so the real hooks are replaced by this fixture.
 */
export const planFormController = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  form: {
    formState: { errors: {}, isSubmitting: false },
    clearErrors: vi.fn(),
    reset: vi.fn(),
  },
  submit: vi.fn(),
  dirty: false,
  assumptions: { ...draftGroup(), birthYearLocked: true, resetFrom: vi.fn() },
  rules: { ...draftGroup(), rules: [], add: vi.fn(), replaceAll: vi.fn() },
  events: { ...draftGroup(), events: [], focusRequest: null, replaceAll: vi.fn() },
  preview: {
    birthYear: 1990,
    lifeExpectancy: 85,
    retirementYear: 2055,
    ageRange: { min: 36, max: 85 },
    assumptionBounds: {},
    projectionStartYear: 2026,
  },
  undo: { canUndo: false, run: vi.fn() },
  sectionState: () => ({}),
  rememberEvents: vi.fn(),
  takeValidated: vi.fn(),
  ...overrides,
});

export const renderInRouter = (element: ReactElement): RenderResult =>
  render(<MemoryRouter>{element}</MemoryRouter>);
