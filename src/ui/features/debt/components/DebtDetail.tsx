import React from 'react';

import { Trash2 } from 'lucide-react';

import { Divider } from '@/ui/components/Divider';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { type MonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import { sectionTitleClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import { DEBT_DANGER_LABELS, DEBT_DETAIL_LABELS } from '@/ui/constants/debt/detailLabels';
import { DebtHistoryTable } from '@/ui/features/debt/components/detail/DebtHistoryTable';
import {
  type DebtAccount,
  type DebtHistoryMonthVM,
} from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { formatCurrency, formatDate } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

interface DebtDetailProps {
  account: DebtAccount;
  trend: MonthTrendSeries;
  historyMonths: DebtHistoryMonthVM[];
  onDelete: () => void;
}

/** 貸款詳情的資料 sections（ADR-0062：header 由 page 層擁有）。 */
const DebtDetail: React.FC<DebtDetailProps> = ({ account, trend, historyMonths, onDelete }) => (
  <div className="space-y-8">
    <PageSection title={DEBT_DETAIL_LABELS.OUTSTANDING_BALANCE_SECTION_TITLE} spacing="compact">
      <div className="flex items-baseline justify-between">
        <FinancialNumber
          value={formatCurrency(account.currentBalance)}
          size="hero"
          tone="negative"
        />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          / {formatCurrency(account.originalAmount)}
        </span>
      </div>
    </PageSection>

    <PageSection title={DEBT_DETAIL_LABELS.LOAN_INFO_SECTION_TITLE} spacing="compact">
      <MetricGroup columns={4}>
        <Metric
          label={DEBT_DETAIL_LABELS.ORIGINAL_LABEL}
          value={formatCurrency(account.originalAmount)}
        />
        <Metric
          label={DEBT_DETAIL_LABELS.MONTHLY_PAYMENT_LABEL}
          value={formatCurrency(account.monthlyPayment)}
        />
        <Metric label={DEBT_DETAIL_LABELS.INTEREST_RATE_LABEL} value={`${account.interestRate}%`} />
        <Metric
          label={DEBT_DETAIL_LABELS.PERIOD_LABEL}
          value={`${formatDate(account.startDate)} ~ ${formatDate(account.endDate)}`}
        />
      </MetricGroup>
    </PageSection>

    <PageSection title={DEBT_DETAIL_LABELS.TREND_SECTION_TITLE} spacing="compact">
      {trend.hasData ? (
        <InteractiveLineChart
          values={trend.values}
          points={trend.points}
          xLabels={trend.labels}
          includeZero={false}
          yAxis="left"
          height={320}
          ariaLabel="12 month loan balance trend"
        />
      ) : (
        <p className="text-sm text-muted-foreground">{DEBT_DETAIL_LABELS.TREND_EMPTY_HINT}</p>
      )}
    </PageSection>

    <PageSection title={DEBT_DETAIL_LABELS.HISTORY_SECTION_TITLE} spacing="compact">
      <DebtHistoryTable months={historyMonths} />
    </PageSection>

    <section className="space-y-3 pt-10">
      <Divider className="border-destructive" />
      <p className={cn(sectionTitleClass, 'text-destructive')}>{DEBT_DANGER_LABELS.MODULE}</p>
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 size={14} aria-hidden="true" />
        {DEBT_DANGER_LABELS.DELETE}
      </Button>
    </section>
  </div>
);

export default DebtDetail;
