import { describe, expect, it } from 'vitest';

import { CLOSE_STAGE_IDS } from '@/domains/financial_period/schemas';

import {
  CLOSE_STAGE_LABELS,
  CLOSE_STAGE_ORDER,
  MONTHLY_CLOSE_LABELS,
  getCloseStageLabel,
} from './monthlyCloseLabels';

describe('monthlyCloseLabels', () => {
  it('covers every close stage id with a display label', () => {
    for (const stageId of CLOSE_STAGE_IDS) {
      expect(CLOSE_STAGE_LABELS[stageId]).toBeTruthy();
      expect(getCloseStageLabel(stageId)).toBe(CLOSE_STAGE_LABELS[stageId]);
    }
  });

  it('exposes the canonical stage order from the domain', () => {
    expect(CLOSE_STAGE_ORDER).toEqual(CLOSE_STAGE_IDS);
  });

  it('provides the page-level labels', () => {
    expect(MONTHLY_CLOSE_LABELS.PAGE_TITLE).toBe('月度關帳');
    expect(MONTHLY_CLOSE_LABELS.FINALIZED).toBeTruthy();
    expect(MONTHLY_CLOSE_LABELS.PAUSED).toBeTruthy();
  });
});
