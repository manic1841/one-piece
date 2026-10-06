import React from 'react';

import { Info } from 'lucide-react';

import { DangerZone } from '@/ui/components/DangerZone';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import {
  PORTFOLIO_DANGER_LABELS,
  PORTFOLIO_DETAIL_LABELS,
  PORTFOLIO_PERFORMANCE_COLUMN_LABELS,
  PORTFOLIO_PERFORMANCE_COLUMN_WIDTHS,
} from '@/ui/constants/portfolio/labels';
import { type PortfolioDetailVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';

interface PortfolioDetailProps {
  vm: PortfolioDetailVM;
  onDelete: () => void;
}

/** Portfolio detail data sections. The page owns the header, states and commands. */
const PortfolioDetail: React.FC<PortfolioDetailProps> = ({ vm, onDelete }) => {
  return (
    <div className="space-y-8">
      <PageSection title={PORTFOLIO_DETAIL_LABELS.VALUE_SECTION} spacing="compact" className="pt-0">
        <div className="flex items-baseline justify-between">
          <FinancialNumber value={vm.totalValueText} size="hero" />
          {vm.asOfText && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {vm.asOfText}
            </span>
          )}
        </div>
      </PageSection>

      <PageSection title={PORTFOLIO_DETAIL_LABELS.BREAKDOWN_SECTION} spacing="compact">
        <MetricGroup columns={2}>
          <Metric label={PORTFOLIO_DETAIL_LABELS.SECURITIES} value={vm.securitiesName} />
          <Metric label={PORTFOLIO_DETAIL_LABELS.BANK} value={vm.bankName} />
        </MetricGroup>
      </PageSection>

      <PageSection
        title={PORTFOLIO_DETAIL_LABELS.RETURN_SECTION}
        spacing="compact"
        action={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={PORTFOLIO_DETAIL_LABELS.RETURN_METHOD_LABEL}
              >
                <Info size={14} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{PORTFOLIO_DETAIL_LABELS.RETURN_METHOD_TOOLTIP}</TooltipContent>
          </Tooltip>
        }
      >
        <MetricGroup columns={2}>
          <Metric label={PORTFOLIO_DETAIL_LABELS.MONTHLY} value={vm.monthlyReturnText} />
          <Metric label={PORTFOLIO_DETAIL_LABELS.CUMULATIVE} value={vm.cumulativeReturnText} />
        </MetricGroup>
      </PageSection>

      <PageSection title={PORTFOLIO_DETAIL_LABELS.RETURN_CALCULATION_SECTION} spacing="compact">
        <MetricGroup columns={4}>
          <Metric
            label={PORTFOLIO_DETAIL_LABELS.PREVIOUS_VALUE}
            value={vm.breakdown.previousValueText}
          />
          <Metric
            label={PORTFOLIO_DETAIL_LABELS.CURRENT_VALUE}
            value={vm.breakdown.currentValueText}
          />
          <Metric
            label={PORTFOLIO_DETAIL_LABELS.INVESTMENT_CASH_FLOW}
            value={vm.breakdown.investmentCashFlowText}
          />
          <Metric
            label={PORTFOLIO_DETAIL_LABELS.CALCULATED_RETURN}
            value={vm.breakdown.calculatedReturnText}
          />
        </MetricGroup>
      </PageSection>

      <PageSection title={PORTFOLIO_DETAIL_LABELS.TREND_SECTION} spacing="compact">
        {vm.trend.hasData ? (
          <InteractiveLineChart
            values={vm.trend.values}
            points={vm.trend.points}
            xLabels={vm.trend.labels}
            includeZero={false}
            yAxis="left"
            height={320}
            ariaLabel="12 month portfolio value trend"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{PORTFOLIO_DETAIL_LABELS.NO_SNAPSHOT}</p>
        )}
      </PageSection>

      <PageSection title={PORTFOLIO_DETAIL_LABELS.PERFORMANCE_SECTION} spacing="compact">
        <DataTable>
          <DataTableColGroup widths={PORTFOLIO_PERFORMANCE_COLUMN_WIDTHS} />
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>{PORTFOLIO_PERFORMANCE_COLUMN_LABELS.DATE}</DataTableHeadCell>
              <DataTableHeadCell align="number">
                {PORTFOLIO_PERFORMANCE_COLUMN_LABELS.TOTAL_VALUE}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {PORTFOLIO_PERFORMANCE_COLUMN_LABELS.RETURN}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {PORTFOLIO_PERFORMANCE_COLUMN_LABELS.CUMULATIVE}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {PORTFOLIO_PERFORMANCE_COLUMN_LABELS.NET_FLOW}
              </DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {vm.performanceRows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell className="font-mono text-[12px]">{row.dateText}</DataTableCell>
                <DataTableCell align="number">{row.totalValueText}</DataTableCell>
                <DataTableCell align="number">{row.returnText}</DataTableCell>
                <DataTableCell align="number">{row.cumulativeText}</DataTableCell>
                <DataTableCell align="number">{row.netFlowText}</DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>

        <MobileDataList>
          {vm.performanceRows.map((row) => (
            <MobileDataRow key={row.id}>
              <div className="flex items-center justify-between gap-2 text-sm font-medium">
                <span className="font-mono text-[12px] tabular-nums">{row.dateText}</span>
                <span className="font-mono tabular-nums">{row.totalValueText}</span>
              </div>
              <MobileDataField label={PORTFOLIO_PERFORMANCE_COLUMN_LABELS.RETURN}>
                <span className="font-mono text-sm tabular-nums">{row.returnText}</span>
              </MobileDataField>
              <MobileDataField label={PORTFOLIO_PERFORMANCE_COLUMN_LABELS.CUMULATIVE}>
                <span className="font-mono text-sm tabular-nums">{row.cumulativeText}</span>
              </MobileDataField>
              <MobileDataField label={PORTFOLIO_PERFORMANCE_COLUMN_LABELS.NET_FLOW}>
                <span className="font-mono text-sm tabular-nums">{row.netFlowText}</span>
              </MobileDataField>
            </MobileDataRow>
          ))}
        </MobileDataList>
      </PageSection>

      <DangerZone actionLabel={PORTFOLIO_DANGER_LABELS.DELETE} onAction={onDelete} />
    </div>
  );
};

export default PortfolioDetail;
