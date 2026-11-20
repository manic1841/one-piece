import { cn } from '@/ui/utils/cn';

import { eyebrowClass } from './eyebrow';

/** `list` = stacked label above value, `row` = value right of the label, `inline` = compact pair. */
export type DefinitionLayout = 'list' | 'row' | 'inline';

export interface DefinitionItem {
  label: string;
  value: string;
  /** Optional value tone, e.g. a money sign colour. */
  valueClassName?: string;
}

interface DefinitionRowsProps {
  items: DefinitionItem[];
  layout?: DefinitionLayout;
  /** Draws a divider between entries. */
  divided?: boolean;
  className?: string;
}

const ROW_CLASS: Record<DefinitionLayout, string> = {
  list: 'grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4',
  row: 'flex items-center justify-between gap-4 py-2 text-sm',
  inline: 'flex gap-2',
};

const LABEL_CLASS: Record<DefinitionLayout, string> = {
  list: eyebrowClass,
  row: 'text-muted-foreground',
  inline: 'text-muted-foreground',
};

/**
 * Read-only label/value pairs as a `<dl>`. Shared by the projection snapshot,
 * the annual year panel and the event timeline so one definition layout exists.
 */
export function DefinitionRows({
  items,
  layout = 'list',
  divided = false,
  className,
}: DefinitionRowsProps) {
  return (
    <dl className={cn(layout === 'list' && 'space-y-2', className)}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cn(ROW_CLASS[layout], divided && 'border-b border-border last:border-b-0')}
        >
          <dt className={LABEL_CLASS[layout]}>{item.label}</dt>
          <dd className={cn('break-words font-mono tabular-nums', item.valueClassName)}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
