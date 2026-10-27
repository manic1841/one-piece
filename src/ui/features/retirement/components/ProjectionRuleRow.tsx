import { RULE_LABELS, RULE_METHOD_LABELS } from '@/ui/constants/retirement/setupLabels';
import { type RuleDraftVM } from '@/ui/features/retirement/viewmodels/ruleForm.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

interface ProjectionRuleRowProps {
  rule: RuleDraftVM;
  selected: boolean;
  /** Number of schema errors on this rule, shown as a quiet marker. */
  errorCount: number;
  onSelect: () => void;
}

/** The method's parameter as one read-only fragment; an empty value prints a dash. */
function parameterSummary(rule: RuleDraftVM): string {
  const amount = Number(rule.amountText);

  switch (rule.method) {
    case 'fixedAmount':
      return rule.amountText.trim() === '' || !Number.isFinite(amount)
        ? '—'
        : formatCurrency(amount);
    case 'percentage':
      return rule.ratioText.trim() === '' ? '—' : `${rule.ratioText}%`;
    case 'growthRate':
      return rule.rateText.trim() === '' ? '—' : `${rule.rateText}%`;
    default:
      return '';
  }
}

/**
 * One rule as a list row: name, parameter, method and state. Selecting it loads
 * the inspector — the row holds no inputs, so the list stays a list and the
 * fields exist in exactly one place.
 */
export function ProjectionRuleRow({
  rule,
  selected,
  errorCount,
  onSelect,
}: ProjectionRuleRowProps) {
  const name = (rule.name ?? '').trim();
  const parameter = parameterSummary(rule);

  return (
    <li data-testid="rule-row">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'hover:bg-muted/50 focus-visible:ring-ring flex w-full items-baseline gap-3 rounded-md px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none',
          selected && 'bg-muted',
          !rule.enabled && 'opacity-60',
        )}
      >
        <span
          className={cn('min-w-0 flex-1 truncate text-sm', name === '' && 'text-muted-foreground')}
        >
          {name === '' ? RULE_LABELS.UNNAMED_RULE : name}
        </span>
        {parameter !== '' && (
          <span className="text-muted-foreground shrink-0 font-mono text-sm tabular-nums">
            {parameter}
          </span>
        )}
        <span className="text-muted-foreground shrink-0 text-[13px]">
          {RULE_METHOD_LABELS[rule.method]}
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
