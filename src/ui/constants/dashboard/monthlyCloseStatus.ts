import { type FinancialPeriodStatus } from '@/domains/financial_period/schemas';
import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { PERIOD_STATUS_TEXT } from '@/ui/constants/monthlyClose';

export const DASHBOARD_CLOSE_LABELS = {
  SECTION_TITLE: 'MONTHLY CLOSE',
  ENTRY_HINT: '月度關帳工作流程',
} as const;

const DASHBOARD_CLOSE_STATUS_TEXT_MAP = PERIOD_STATUS_TEXT;

export { DASHBOARD_CLOSE_STATUS_TEXT_MAP };

export const DASHBOARD_CLOSE_STATUS_GLYPHS: Record<FinancialPeriodStatus, StatusGlyphType> = {
  IN_PROGRESS: 'active',
  NEEDS_REVIEW: 'review',
  CLOSED: 'verified',
};

export const DASHBOARD_CLOSE_NO_RECORD = {
  glyphType: 'waiting',
  statusText: PERIOD_STATUS_TEXT.NOT_STARTED,
} as const;
