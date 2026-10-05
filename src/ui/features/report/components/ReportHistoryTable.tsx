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

interface ReportHistoryTableProps {
  rows: ReportHistoryRowVM[];
}

/** 報表歷史：每列一個期間（月或年），顯示淨利、期末權益與期末現金。 */
export const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({ rows }) => {
  const navigate = useNavigate();

  const go = (period: string) => navigate(detailPath(period));

  return (
    <>
      <MobileDataList>
        {rows.map((row) => (
          <MobileDataRow
            key={row.period}
            data-testid={`report-history-row-${row.period}`}
            role="button"
            tabIndex={0}
            onClick={() => go(row.period)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              go(row.period);
            }}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          >
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-mono tabular-nums">{row.period}</span>
                {row.status && <StatusGlyph type={row.status.glyph} label={row.status.text} />}
              </span>
              <span className={cn('font-mono tabular-nums', MONEY_TONE_CLASS[row.netIncomeTone])}>
                {row.netIncomeText}
              </span>
            </div>
            <MobileDataField label={REPORT_LIST_LABELS.COLUMN_EQUITY}>
              <span className="font-mono text-sm tabular-nums">{row.equityText}</span>
            </MobileDataField>
            <MobileDataField label={REPORT_LIST_LABELS.COLUMN_CASH}>
              <span className="font-mono text-sm tabular-nums">{row.endingCashText}</span>
            </MobileDataField>
          </MobileDataRow>
        ))}
      </MobileDataList>

      <DataTableScrollArea>
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
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  go(row.period);
                }}
                interactive
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
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
