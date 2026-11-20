import { useNavigate } from 'react-router-dom';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import { REPORT_LIST_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { cn } from '@/ui/utils/cn';

import { type ReportHistoryRowVM } from '../viewmodels/reportHistory.vm';

const COLUMN_WIDTHS = [22, 26, 26, 26] as const;

const detailPath = (period: string): string => `/reports/${period}`;

/** Enter/Space on a focused row opens it; two renders share one handler. */
const rowKeyDown =
  (go: (period: string) => void, period: string) =>
  (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    go(period);
  };

const INTERACTIVE_CLASS =
  'cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

interface ReportHistoryTableProps {
  rows: ReportHistoryRowVM[];
}

/** 報表歷史：每列一個期間（月或年），顯示淨利、期末權益與期末現金。 */
export const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({ rows }) => {
  const navigate = useNavigate();

  const go = (period: string) => navigate(detailPath(period));

  return (
    <>
      {/* Four numeric columns only fit from `lg`; tablets keep the grouped rows. */}
      <MobileDataList className="md:block lg:hidden">
        {rows.map((row) => (
          <MobileDataRow
            key={row.period}
            data-testid={`report-history-row-${row.period}`}
            role="button"
            tabIndex={0}
            onClick={() => go(row.period)}
            onKeyDown={rowKeyDown(go, row.period)}
            className={INTERACTIVE_CLASS}
          >
            {/* One fact per line: the row opens on the period it is about, and
                everything else is a labelled field below it. */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="font-mono tabular-nums">{row.period}</span>
              {row.status && <StatusGlyph type={row.status.glyph} label={row.status.text} />}
              <span aria-hidden className="ml-auto text-muted-foreground">
                ›
              </span>
            </div>
            <MobileDataField label={REPORT_LIST_LABELS.COLUMN_NET_INCOME}>
              <span
                className={cn(
                  'font-mono text-sm tabular-nums',
                  MONEY_TONE_CLASS[row.netIncomeTone],
                )}
              >
                {row.netIncomeText}
              </span>
            </MobileDataField>
            <MobileDataField label={REPORT_LIST_LABELS.COLUMN_EQUITY}>
              <span className="font-mono text-sm tabular-nums">{row.equityText}</span>
            </MobileDataField>
            <MobileDataField label={REPORT_LIST_LABELS.COLUMN_CASH}>
              <span className="font-mono text-sm tabular-nums">{row.endingCashText}</span>
            </MobileDataField>
          </MobileDataRow>
        ))}
      </MobileDataList>

      <DataTableScrollArea className="md:hidden lg:block">
        <DataTable data-testid="report-history-table">
          <DataTableColGroup widths={COLUMN_WIDTHS} />
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>{REPORT_LIST_LABELS.COLUMN_PERIOD}</DataTableHeadCell>
              <DataTableHeadCell align="number">
                {REPORT_LIST_LABELS.COLUMN_NET_INCOME}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {REPORT_LIST_LABELS.COLUMN_EQUITY}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">{REPORT_LIST_LABELS.COLUMN_CASH}</DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <DataTableRow
                key={row.period}
                data-testid={`report-history-row-${row.period}`}
                onClick={() => go(row.period)}
                tabIndex={0}
                onKeyDown={rowKeyDown(go, row.period)}
                interactive
                className={INTERACTIVE_CLASS}
              >
                <DataTableCell>
                  <span className="flex items-center gap-2">
                    <span className="font-mono tabular-nums">{row.period}</span>
                    {row.status && <StatusGlyph type={row.status.glyph} label={row.status.text} />}
                  </span>
                </DataTableCell>
                <DataTableCell align="number" className={MONEY_TONE_CLASS[row.netIncomeTone]}>
                  {row.netIncomeText}
                </DataTableCell>
                <DataTableCell align="number">{row.equityText}</DataTableCell>
                <DataTableCell align="number">{row.endingCashText}</DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
    </>
  );
};
