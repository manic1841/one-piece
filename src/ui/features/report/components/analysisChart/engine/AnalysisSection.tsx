import { type ReactNode } from 'react';

import { PageSection } from '@/ui/components/PageSection';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';
import { cn } from '@/ui/utils/cn';

interface AnalysisSectionProps {
  id: string;
  title: string;
  latestText: string | null;
  /** One-line methodology note, pinned to the section's bottom so paired bands align. */
  footnote?: string;
  insufficient: boolean;
  /** Extra classes on the section band, e.g. to tighten its top padding. */
  className?: string;
  children: ReactNode;
}

/** One anchored analysis block: heading, selected-period value, footnote and body. */
export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  id,
  title,
  latestText,
  footnote,
  insufficient,
  className,
  children,
}) => (
  <div
    id={id}
    tabIndex={-1}
    className="h-full scroll-mt-32 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <PageSection
      title={title}
      spacing="compact"
      hint={latestText ?? undefined}
      className={cn('flex h-full flex-col', className)}
    >
      {insufficient ? (
        <p className="py-6 text-sm text-muted-foreground">{REPORT_ANALYSIS_LABELS.INSUFFICIENT}</p>
      ) : (
        children
      )}
      {footnote !== undefined && (
        <p className="mt-auto pt-3 text-xs text-muted-foreground">{footnote}</p>
      )}
    </PageSection>
  </div>
);
