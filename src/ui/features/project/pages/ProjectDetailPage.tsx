import { ArrowRight, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
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
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  PROJECT_DEBT_COLUMN_WIDTHS,
  PROJECT_DETAIL_LABELS,
  PROJECT_SUMMARY_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import { ProjectCashFlowPanel } from '@/ui/features/project/components/detail/ProjectCashFlowPanel';
import { useProjectDetailPage } from '@/ui/features/project/hooks/useProjectDetailPage';
import { type Project } from '@/ui/features/project/viewmodels/projectForm.vm';
import { formatCurrency } from '@/ui/utils';

interface ProjectDetailPageProps {
  project?: Project;
}

const SKELETON_ROWS = [0, 1, 2];

const netTone = (net: number): 'positive' | 'negative' => (net >= 0 ? 'positive' : 'negative');

export default function ProjectDetailPage({ project }: ProjectDetailPageProps) {
  const navigate = useNavigate();
  const {
    activeProject,
    projectDebt,
    isActive,
    monthGroups,
    summary,
    loading,
    error,
    notFound,
    reload,
    handleRename,
    handleToggleActive,
  } = useProjectDetailPage({ project });

  const backToList = () => navigate('/projects');

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{PROJECT_DETAIL_LABELS.LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (notFound || !activeProject) {
    return (
      <EmptyState
        title={PROJECT_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={PROJECT_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={backToList}>
            {PROJECT_DETAIL_LABELS.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={<InlineEditableTitle value={activeProject.name} onSave={handleRename} />}
        crumb={PROJECT_DETAIL_LABELS.CRUMB}
        onBack={backToList}
        badge={!isActive ? <StatusGlyph type="inactive" /> : undefined}
        actions={
          isActive ? (
            <Button variant="destructive" onClick={() => void handleToggleActive()}>
              <Power size={16} />
              {PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void handleToggleActive()}>
              {PROJECT_DETAIL_LABELS.ACTIVATE_ACTION}
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PROJECT_DETAIL_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      )}

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
    </div>
  );
}
