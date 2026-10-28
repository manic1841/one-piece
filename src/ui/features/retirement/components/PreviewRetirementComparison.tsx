import { type KeyboardEvent, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PREVIEW_LABELS as LABELS } from '@/ui/constants/retirement/previewLabels';
import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { type ProjectionSummaryVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { type RetirementComparisonVM } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';
import { cn } from '@/ui/utils/cn';

export function PreviewRetirementComparison({
  retirementAge,
  comparisons,
  summary,
  onApply,
}: {
  retirementAge: number;
  comparisons: RetirementComparisonVM[];
  summary: ProjectionSummaryVM;
  onApply: (age: number) => void;
}) {
  const minAge = comparisons[0]?.age ?? retirementAge;
  const maxAge = comparisons.at(-1)?.age ?? retirementAge;
  const [age, setAge] = useState(Math.min(maxAge, Math.max(minAge, retirementAge)));
  const unchanged = age === retirementAge;
  const selected = comparisons.find((comparison) => comparison.age === age);
  const trial = selected?.summary;
  const earliest = comparisons.find((comparison) => comparison.summary?.isBankrupt === false);
  const hasErrors = comparisons.some((comparison) => comparison.error !== null);
  const handleAgeKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setAge((current) =>
      Math.max(minAge, Math.min(maxAge, current + (event.key === 'ArrowLeft' ? -1 : 1))),
    );
  };
  const rows = [
    {
      label: LABELS.RUNS_OUT,
      value: summary.isBankrupt ? summary.bankruptcyYearText : LABELS.NEVER,
      negative: summary.isBankrupt,
      trial: trial ? (trial.isBankrupt ? trial.bankruptcyYearText : LABELS.NEVER) : '—',
      trialNegative: trial?.isBankrupt,
    },
    {
      label: PROJECTION_RESULT_LABELS.METRIC_FINAL_NET_WORTH,
      value: summary.finalNetWorthText,
      trial: trial?.finalNetWorthText ?? '—',
      delta: unchanged ? null : selected?.finalDelta,
    },
    {
      label: PROJECTION_RESULT_LABELS.METRIC_RETIREMENT_NET_WORTH,
      value: summary.retirementNetWorthText ?? '—',
      trial: trial?.retirementNetWorthText ?? '—',
      delta: unchanged ? null : selected?.retirementDelta,
    },
  ];

  if (comparisons.length === 0) {
    return <p className="text-sm text-muted-foreground">{LABELS.NO_COMPARISON_AGES}</p>;
  }

  return (
    <section className="border-y border-border py-6" aria-label={LABELS.COMPARISON}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
        <div>
          <h2 className={eyebrowClass}>{LABELS.COMPARISON}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{LABELS.COMPARISON_DESCRIPTION}</p>
          <div className="mt-5 flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              aria-label={LABELS.EARLIER}
              disabled={age <= minAge}
              onClick={() => setAge(age - 1)}
              onKeyDown={handleAgeKey}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <span className="min-w-16 text-center">
              <span className="block text-xs text-muted-foreground">{LABELS.RETIRE_AT}</span>
              <output className="font-mono text-3xl tabular-nums" aria-live="polite">
                {age}
              </output>
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label={LABELS.LATER}
              disabled={age >= maxAge}
              onClick={() => setAge(age + 1)}
              onKeyDown={handleAgeKey}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={unchanged || !trial}
            onClick={() => onApply(age)}
          >
            {LABELS.APPLY(age)}
          </Button>
        </div>
        <div className="min-w-0">
          <table className="w-full table-fixed text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border">
                <td className="w-1/3" />
                <th scope="col" className="px-2 pb-3 font-medium text-muted-foreground">
                  {LABELS.CURRENT(retirementAge)}
                </th>
                <th scope="col" className="px-2 pb-3 font-medium text-foreground">
                  {LABELS.TRIAL(age)}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <th scope="row" className="py-3 pr-3 text-xs font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  <td
                    className={cn(
                      'px-2 py-3 font-mono tabular-nums',
                      row.negative && 'text-negative',
                    )}
                  >
                    {row.value}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-3 font-mono tabular-nums',
                      row.trialNegative && 'text-negative',
                    )}
                  >
                    {unchanged ? row.value : row.trial}
                    {row.delta && (
                      <span className="mt-1 block text-xs text-muted-foreground">{row.delta}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{LABELS.EARLIEST}</span>
            {hasErrors ? (
              <span>{LABELS.COMPARISON_FAILED}</span>
            ) : earliest ? (
              <Button variant="text" size="sm" onClick={() => setAge(earliest.age)}>
                {earliest.age}
              </Button>
            ) : (
              <span>{LABELS.NO_SUSTAINABLE_AGE}</span>
            )}
          </div>
          {selected?.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{selected.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{LABELS.COMPARISON_NOTE}</p>
    </section>
  );
}
