import React from 'react';

import { DangerZone } from '@/ui/components/DangerZone';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { LoadErrorAlert } from '@/ui/components/LoadErrorAlert';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
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
import {
  PROJECT_DANGER_LABELS,
  PROJECT_DEBT_COLUMN_WIDTHS,
  PROJECT_DETAIL_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import { ProjectCashFlowPanel } from '@/ui/features/project/components/detail/ProjectCashFlowPanel';
import {
  type ProjectDebtRow,
  type ProjectMonthGroup,
  type ProjectSummary,
} from '@/ui/features/project/viewmodels/projectDetail.vm';

const netTone = (net: number): 'positive' | 'negative' => (net >= 0 ? 'positive' : 'negative');

interface ProjectDetailProps {
  summary: ProjectSummary;
  balanceText: string | null;
  balanceLoading: boolean;
  /** Display copy plus the raw failure for the alert's tooltip. */
  balanceError: { message: string; detail: string } | null;
  onRetryBalance: () => void;
  latestSettledText: string;
  projectDebt: ProjectDebtRow[];
  monthGroups: ProjectMonthGroup[];
  /** `null` means the older-data probe failed: "more" is unknown (ADR-0072). */
  hasMore: boolean | null;
  onLoadMore: () => void;
  onDelete: () => void;
}

/** 專案詳情的資料 sections（ADR-0062：header 由 page 層擁有）。 */
const ProjectDetail: React.FC<ProjectDetailProps> = ({
  summary,
  balanceText,
  balanceLoading,
  balanceError,
  onRetryBalance,
  latestSettledText,
  projectDebt,
  monthGroups,
  hasMore,
  onLoadMore,
  onDelete,
}) => (
  <div className="space-y-8">
    <PageSection title={PROJECT_DETAIL_LABELS.BALANCE_SECTION_TITLE} spacing="compact">
      {balanceLoading ? (
        <Skeleton className="h-12 w-48" />
      ) : (
        <div data-testid="project-balance">
          <FinancialNumber value={balanceText} size="hero" />
        </div>
      )}
      {balanceError !== null && (
        <div className="mt-2">
          <LoadErrorAlert
            errorMessage={balanceError.detail}
            message={balanceError.message}
            retryLabel={PROJECT_DETAIL_LABELS.RETRY_ACTION}
            onRetry={onRetryBalance}
            testId="project-balance-error"
          />
        </div>
      )}
      {!balanceLoading && balanceError === null && (
        <p className="mt-1 text-xs text-muted-foreground">{latestSettledText}</p>
      )}
    </PageSection>

    <PageSection title={PROJECT_DETAIL_LABELS.SUMMARY_SECTION_TITLE} spacing="compact">
      <MetricGroup columns={3} lastSpansFull>
        <Metric label={summary.incomeLabel} value={summary.incomeText} tone="positive" />
        <Metric label={summary.expenseLabel} value={summary.expenseText} tone="negative" />
        <Metric label={summary.netLabel} value={summary.netText} tone={netTone(summary.net)} />
      </MetricGroup>
    </PageSection>

    <PageSection title={PROJECT_DETAIL_LABELS.DEBT_SECTION_TITLE} spacing="compact">
      {projectDebt.length === 0 ? (
        <p className="text-sm text-muted-foreground">{PROJECT_DETAIL_LABELS.DEBT_EMPTY_HINT}</p>
      ) : (
        <>
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={PROJECT_DEBT_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell>{PROJECT_DETAIL_LABELS.DEBT_LOAN_COLUMN}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECT_DETAIL_LABELS.DEBT_BALANCE_COLUMN}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {projectDebt.map((debt) => (
                  <DataTableRow key={debt.id}>
                    <DataTableCell>{debt.name}</DataTableCell>
                    <DataTableCell align="number">{debt.balanceText}</DataTableCell>
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>
          <MobileDataList>
            {projectDebt.map((debt) => (
              <MobileDataRow key={debt.id}>
                <MobileDataField label={PROJECT_DETAIL_LABELS.DEBT_LOAN_COLUMN}>
                  {debt.name}
                </MobileDataField>
                <MobileDataField label={PROJECT_DETAIL_LABELS.DEBT_BALANCE_COLUMN}>
                  <span className="font-mono text-sm tabular-nums">{debt.balanceText}</span>
                </MobileDataField>
              </MobileDataRow>
            ))}
          </MobileDataList>
        </>
      )}
    </PageSection>

    <ProjectCashFlowPanel groups={monthGroups} hasMore={hasMore} onLoadMore={onLoadMore} />

    <DangerZone actionLabel={PROJECT_DANGER_LABELS.DELETE} onAction={onDelete} />
  </div>
);

export default ProjectDetail;
