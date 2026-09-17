import {
  DASHBOARD_CLOSE_NO_RECORD,
  DASHBOARD_CLOSE_STATUS_GLYPHS,
  DASHBOARD_CLOSE_STATUS_TEXT_MAP,
} from '@/ui/constants/dashboard/monthlyCloseStatus';
import { formatYearMonth } from '@/ui/utils';
import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { type FinancialPeriod } from '@/domains/financial_period/schemas';

export interface DashboardCloseStatusVM {
  periodText: string;
  glyphType: StatusGlyphType;
  statusText: string;
}

export const mapPeriodToCloseStatusVM = (
  period: FinancialPeriod | null,
  yearMonth: string,
): DashboardCloseStatusVM => {
  if (!period) {
    return {
      periodText: formatYearMonthOf(yearMonth),
      glyphType: DASHBOARD_CLOSE_NO_RECORD.glyphType,
      statusText: DASHBOARD_CLOSE_NO_RECORD.statusText,
    };
  }

  return {
    periodText: formatYearMonthOf(period.yearMonth),
    glyphType: DASHBOARD_CLOSE_STATUS_GLYPHS[period.status],
    statusText: DASHBOARD_CLOSE_STATUS_TEXT_MAP[period.status],
  };
};

const formatYearMonthOf = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number);
  return formatYearMonth(year, month);
};
