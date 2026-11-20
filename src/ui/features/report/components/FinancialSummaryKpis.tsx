import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AnimatedNumber } from '@/ui/components/AnimatedNumber';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import { cn } from '@/ui/utils/cn';

import { type ReportSummaryVM, type SummaryKpiVM } from '../viewmodels/reportSummary.vm';

/**
 * Only the label and the number are the link, so the hit area stays exactly the
 * deep link. The shared period and unclosed flag live in the section header.
 */
const KpiLink: React.FC<{ kpi: SummaryKpiVM }> = ({ kpi }) => (
  <Link
    to={kpi.href}
    aria-label={kpi.ariaLabel}
    className="group inline-flex min-h-11 flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className={eyebrowClass}>{kpi.label}</span>
    <span
      className={cn(
        'mt-1.5 flex items-center gap-2 font-mono text-lg tabular-nums whitespace-nowrap xl:text-xl',
        MONEY_TONE_CLASS[kpi.tone],
      )}
    >
      <AnimatedNumber value={kpi.value} format={kpi.format} animateOnMount />
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 text-muted-foreground transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      />
    </span>
  </Link>
);

/** Landing 財務摘要：四個 KPI，全都是通往分析頁的深連結。 */
export const FinancialSummaryKpis: React.FC<{ vm: ReportSummaryVM }> = ({ vm }) => (
  <div className="grid grid-cols-1 gap-y-4 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
    {vm.kpis.map((kpi) => (
      <div key={kpi.key} className="px-3 xl:px-5">
        <KpiLink kpi={kpi} />
      </div>
    ))}
  </div>
);
