import React from 'react';

import { Trash2 } from 'lucide-react';

import { Divider } from '@/ui/components/Divider';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
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
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import {
  PROJECT_DANGER_LABELS,
  PROJECT_DEBT_COLUMN_WIDTHS,
  PROJECT_DETAIL_LABELS,
  PROJECT_SUMMARY_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import { ProjectCashFlowPanel } from '@/ui/features/project/components/detail/ProjectCashFlowPanel';
import {
  type ProjectDebtRow,
  type ProjectMonthGroup,
  type ProjectSummary,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

const netTone = (net: number): 'positive' | 'negative' => (net >= 0 ? 'positive' : 'negative');

interface ProjectDetailProps {
  summary: ProjectSummary;
  projectDebt: ProjectDebtRow[];
  monthGroups: ProjectMonthGroup[];
  onDelete: () => void;
}

/** 專案詳情的資料 sections（ADR-0062：header 由 page 層擁有）。 */
const ProjectDetail: React.FC<ProjectDetailProps> = ({
  summary,
  projectDebt,
  monthGroups,
  onDelete,
}) => (
  <div className="space-y-8">
    <PageSection title={PROJECT_DETAIL_LABELS.SUMMARY_SECTION_TITLE} spacing="compact">
      <MetricGroup columns={4}>
        <Metric
          label={PROJECT_SUMMARY_LABELS.INCOME}
          value={formatCurrency(summary.income)}
          tone="positive"
        />
        <Metric
          label={PROJECT_SUMMARY_LABELS.EXPENSE}
          value={formatCurrency(summary.expense)}
          tone="negative"
        />
        <Metric
          label={PROJECT_SUMMARY_LABELS.NET_CASH_FLOW}
          value={formatCurrency(summary.net)}
          tone={netTone(summary.net)}
        />
        <Metric label={PROJECT_SUMMARY_LABELS.BALANCE} value={summary.balanceText} />
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

    <ProjectCashFlowPanel groups={monthGroups} />

    <section className="space-y-3 pt-10">
      <Divider className="border-destructive" />
      <p className={cn(sectionTitleClass, 'text-destructive')}>{PROJECT_DANGER_LABELS.MODULE}</p>
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 size={14} aria-hidden="true" />
        {PROJECT_DANGER_LABELS.DELETE}
      </Button>
    </section>
  </div>
);

export default ProjectDetail;
