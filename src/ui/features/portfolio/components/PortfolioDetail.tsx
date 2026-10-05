import React from 'react';

import { Divider } from '@/ui/components/Divider';
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
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import {
  PORTFOLIO_DANGER_LABELS,
  PORTFOLIO_DETAIL_LABELS,
  PORTFOLIO_PERFORMANCE_COLUMN_LABELS,
  PORTFOLIO_PERFORMANCE_COLUMN_WIDTHS,
} from '@/ui/constants/portfolio/labels';
import { type PortfolioDetailVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';
import { cn } from '@/ui/utils/cn';

interface PortfolioDetailProps {
  vm: PortfolioDetailVM;
  onDelete: () => void;
}

/**
 * Portfolio detail data sections (ADR-0058: the page owns the header). It only
 * renders a `PortfolioDetailVM`; all loading, projection and commands live in
 * `usePortfolioDetailPage` (#262 Q12). Every value shown is read from the
 * snapshot's frozen `performance` — nothing is recomputed here (#262 Q7).
 */
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

      <PageSection title={PORTFOLIO_DETAIL_LABELS.RETURN_SECTION} spacing="compact">
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
      </PageSection>

      <section className="space-y-3 pt-10">
        <Divider className="border-destructive" />
        <p className={cn(sectionTitleClass, 'text-destructive')}>
          {PORTFOLIO_DANGER_LABELS.MODULE}
        </p>
        <Button variant="destructive" onClick={onDelete}>
          {PORTFOLIO_DANGER_LABELS.DELETE}
        </Button>
      </section>
    </div>
  );
};

export default PortfolioDetail;
