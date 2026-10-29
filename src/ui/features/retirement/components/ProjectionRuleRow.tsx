import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { RULE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { type RuleDraftVM } from '@/ui/features/retirement/viewmodels/ruleForm.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

interface ProjectionRuleRowProps {
  rule: RuleDraftVM;
  sourceLabel: string;
  selected: boolean;
  /** Number of schema errors on this rule, shown as a quiet marker. */
  errorCount: number;
  onSelect: () => void;
}

/** The method's parameter as one read-only fragment; an empty value prints a dash. */
function parameterSummary(rule: RuleDraftVM, sourceLabel: string): string {
  const amount = Number(rule.amountText);
  const source = sourceLabel || RULE_LABELS.NO_SOURCE;
  const endCondition =
    rule.endConditionType === 'specificAge' && rule.endAge.trim() !== ''
      ? RULE_LABELS.SUMMARY_THROUGH_AGE.replace('{age}', rule.endAge)
      : rule.endConditionType === 'specificYear' && rule.endYear.trim() !== ''
        ? RULE_LABELS.SUMMARY_THROUGH_YEAR.replace('{year}', rule.endYear)
        : rule.endConditionType === 'lifelong'
          ? RULE_LABELS.SUMMARY_LIFELONG
          : RULE_LABELS.SUMMARY_UNTIL_RETIREMENT;

  switch (rule.method) {
    case 'fixedAmount':
      return [
        rule.amountText.trim() === '' || !Number.isFinite(amount)
          ? PROJECTION_COMMON_LABELS.DASH
          : `${formatCurrency(amount)} ${RULE_LABELS.SUMMARY_PER_YEAR}`,
        ...(rule.keepsPace ? [RULE_LABELS.SUMMARY_FOLLOWS_INFLATION] : []),
        endCondition,
      ].join(' · ');
    case 'percentage':
      return [
        `${rule.ratioText.trim() === '' ? PROJECTION_COMMON_LABELS.DASH : `${rule.ratioText}%`} ${RULE_LABELS.SUMMARY_OF} ${source}`,
        ...(rule.keepsPace ? [RULE_LABELS.SUMMARY_FOLLOWS_INFLATION] : []),
        endCondition,
      ].join(' · ');
    case 'growthRate':
      return [
        `${rule.rateText.trim() === '' ? PROJECTION_COMMON_LABELS.DASH : `${rule.rateText}%`} ${RULE_LABELS.SUMMARY_ANNUAL_GROWTH}`,
        source,
        ...(rule.keepsPace ? [RULE_LABELS.SUMMARY_FOLLOWS_INFLATION] : []),
        endCondition,
      ].join(' · ');
    case 'debtAmortization':
      return `${source} · ${RULE_LABELS.SUMMARY_LOAN_SCHEDULE}`;
    case 'inflation':
      return [source, RULE_LABELS.SUMMARY_FOLLOWS_INFLATION, endCondition].join(' · ');
  }
}

/**
 * One rule as a list row: name, parameter, method and state. Selecting it loads
 * the inspector — the row holds no inputs, so the list stays a list and the
 * fields exist in exactly one place.
 */
export function ProjectionRuleRow({
  rule,
  sourceLabel,
  selected,
  errorCount,
  onSelect,
}: ProjectionRuleRowProps) {
  const name = (rule.name ?? '').trim();
  const parameter = parameterSummary(rule, sourceLabel);

  return (
    <li data-testid="rule-row">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none',
          selected && 'bg-muted',
          !rule.enabled && 'opacity-60',
        )}
      >
        <span className="grid min-w-0 flex-1 gap-1">
          <span className={cn('truncate text-sm', name === '' && 'text-muted-foreground')}>
            {name === '' ? RULE_LABELS.UNNAMED_RULE : name}
          </span>
          <span className="truncate text-xs text-muted-foreground">{parameter}</span>
        </span>
        {!rule.enabled && (
          <span className="text-muted-foreground shrink-0 text-[11px] tracking-[0.08em] uppercase">
            {RULE_LABELS.DISABLED}
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-destructive shrink-0 text-[11px]" data-testid="rule-error-count">
            {errorCount}
          </span>
        )}
      </button>
    </li>
  );
}
