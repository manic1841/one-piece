import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import { REPORT_SUMMARY_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { cn } from '@/ui/utils/cn';

import { type ReportSummaryVM, type SummaryKpiVM } from '../viewmodels/reportAnalysis.vm';

const KpiLink: React.FC<{
  kpi: SummaryKpiVM;
  periodText: string;
  unclosed: boolean;
}> = ({ kpi, periodText, unclosed }) => (
  <Link
    to={kpi.href}
    aria-label={kpi.ariaLabel}
    className="group inline-flex min-h-11 flex-col justify-center py-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className={cn(eyebrowClass, 'flex items-center gap-2')}>
      {kpi.label}
      <span className="font-mono normal-case tracking-normal text-muted-foreground">
        {periodText}
      </span>
      {unclosed && <StatusGlyph type="review" label={REPORT_SUMMARY_LABELS.UNCLOSED} />}
    </span>
    <span
      className={cn(
        'mt-1.5 flex items-center gap-2 font-mono text-xl tabular-nums',
        MONEY_TONE_CLASS[kpi.tone],
      )}
    >
      {kpi.valueText}
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 text-muted-foreground transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      />
    </span>
  </Link>
);

/** Landing 財務摘要：四個 KPI，全都是通往分析頁的深連結。 */
export const FinancialSummaryKpis: React.FC<{ vm: ReportSummaryVM }> = ({ vm }) => (
  <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
    {vm.kpis.map((kpi) => (
      <div key={kpi.key} className="px-3 md:px-5">
        <KpiLink kpi={kpi} periodText={vm.periodText} unclosed={vm.unclosed} />
      </div>
    ))}
  </div>
);
