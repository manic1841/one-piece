import React from 'react';

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
  NumberCell,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import { type ProjectSettlementRow } from '@/ui/features/monthly_close/viewmodels/projectSettlement.vm';
import { formatCurrency } from '@/ui/utils';

/** 專案（含結算狀態）／上期餘額／收入／支出／期末餘額。 */
const COLUMN_WIDTHS = [30, 18, 18, 18, 16] as const;

interface CloseProjectSettlementStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  settlements: ProjectSettlementRow[];
  /** Set when the stage's own load failed; the stage shows no rows then. */
  loadErrorMessage?: string | null;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

/** 專案名＋結算狀態：桌機第一格與行動版的名稱列共用。 */
const ProjectName: React.FC<{ row: ProjectSettlementRow }> = ({ row }) => (
  <span className="flex min-w-0 items-center gap-1.5">
    <StatusGlyph type={row.settled ? 'verified' : 'review'} label="" />
    <span className="truncate text-xs text-foreground">{row.projectName}</span>
    {!row.settled && (
      <span className="shrink-0 text-[11px] text-warning">{MONTHLY_CLOSE_LABELS.UNSETTLED}</span>
    )}
  </span>
);

/**
 * PROJECT_SETTLEMENT：無輸入的唯讀階段，列出每個 active 專案的結算狀態與四個
 * 即時 preview 金額。資料列不可點擊（沒有 detail 頁），因此不套用 interactive
 * 的 hover 呈現。
 */
export const CloseProjectSettlementStage: React.FC<CloseProjectSettlementStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  settlements,
  loadErrorMessage = null,
  onConfirm,
  onBackToCurrent,
}) => (
  <CloseStageChrome
    stepText={stepText}
    progressText={progressText}
    confirmedAtText={confirmedAtText}
    confirming={confirming}
    isReviewing={isReviewing}
    isConfirmable={isConfirmable}
    isReadOnly={isReadOnly}
    showActions
    onConfirm={onConfirm}
    onBackToCurrent={onBackToCurrent}
  >
    {settlements.length === 0 ? (
      <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_PROJECTS}</p>
    ) : (
      <>
        <DataTableScrollArea>
          <DataTable>
            <DataTableColGroup widths={COLUMN_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell className="pl-3">
                  {MONTHLY_CLOSE_LABELS.PROJECT}
                </DataTableHeadCell>
                <DataTableHeadCell align="number">
                  {MONTHLY_CLOSE_LABELS.PROJECT_OPENING_BALANCE}
                </DataTableHeadCell>
                <DataTableHeadCell align="number">
                  {MONTHLY_CLOSE_LABELS.INCOME_SECTION}
                </DataTableHeadCell>
                <DataTableHeadCell align="number">
                  {MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}
                </DataTableHeadCell>
                <DataTableHeadCell align="number">
                  {MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}
                </DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              {settlements.map((row) => (
                <DataTableRow key={row.projectId}>
                  <DataTableCell className="pl-3">
                    <ProjectName row={row} />
                  </DataTableCell>
                  <NumberCell value={row.openingBalance} format={formatCurrency} />
                  <NumberCell value={row.income} format={formatCurrency} />
                  <NumberCell value={row.expense} format={formatCurrency} />
                  <NumberCell value={row.closingBalance} format={formatCurrency} />
                </DataTableRow>
              ))}
            </TableBody>
          </DataTable>
        </DataTableScrollArea>

        <MobileDataList>
          {settlements.map((row) => (
            <MobileDataRow key={row.projectId}>
              <ProjectName row={row} />
              <MobileDataField label={MONTHLY_CLOSE_LABELS.PROJECT_OPENING_BALANCE}>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.openingBalance)}
                </span>
              </MobileDataField>
              <MobileDataField label={MONTHLY_CLOSE_LABELS.INCOME_SECTION}>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.income)}
                </span>
              </MobileDataField>
              <MobileDataField label={MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.expense)}
                </span>
              </MobileDataField>
              <MobileDataField label={MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatCurrency(row.closingBalance)}
                </span>
              </MobileDataField>
            </MobileDataRow>
          ))}
        </MobileDataList>
      </>
    )}
    <CloseStageLoadError message={loadErrorMessage} />
  </CloseStageChrome>
);
