import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import type { TooltipContent, TooltipItem } from './chartInteraction';

type ChartTooltipProps = {
  /** Period / point caption, e.g. "SEP 2026". */
  title: string;
  /** Semantic content: a hero datum or a list of peers. */
  content: TooltipContent;
  /** Affordance line, e.g. the action a click performs. */
  hint?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Caller ref, used by the interactive charts to measure the card before anchoring it. */
  ref?: React.Ref<HTMLDivElement>;
};

const itemText = (item: TooltipItem): string =>
  [item.label, item.value]
    .filter((part) => part !== undefined)
    .join(' ')
    .concat(item.detail === undefined ? '' : ` · ${item.detail}`);

const HeroContent: React.FC<{ content: Extract<TooltipContent, { mode: 'hero' }> }> = ({
  content,
}) => {
  const { primary, secondary = [] } = content;

  return (
    <>
      {primary === undefined ? (
        <p className="text-sm leading-tight text-primary">—</p>
      ) : (
        <p className="text-sm leading-tight font-medium tabular-nums text-primary">
          {primary.label !== undefined && (
            <>
              <span className="font-normal text-muted-foreground">{primary.label}</span>{' '}
            </>
          )}
          {primary.value}
          {primary.detail !== undefined && (
            <span className="ml-1 font-normal text-muted-foreground">{primary.detail}</span>
          )}
        </p>
      )}
      {secondary.length > 0 && (
        <p className="mt-0.5 text-muted-foreground">{secondary.map(itemText).join(' · ')}</p>
      )}
    </>
  );
};

const ListContent: React.FC<{ content: Extract<TooltipContent, { mode: 'list' }> }> = ({
  content,
}) => (
  <ul className="mt-0.5 space-y-1">
    {content.items.map((item) => (
      <li key={item.id}>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          {item.color !== undefined && (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-[1px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </p>
        <p className="tabular-nums text-foreground">
          {item.value}
          {item.detail !== undefined && (
            <span className="ml-1 text-muted-foreground">{item.detail}</span>
          )}
        </p>
      </li>
    ))}
  </ul>
);

/** Floating chart hover card: a shared shell around semantic content. */
export function ChartTooltip({ title, content, hint, className, style, ref }: ChartTooltipProps) {
  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        'min-w-[132px] rounded border border-border-strong bg-card px-2.5 py-2 font-mono text-[11px] shadow-lg',
        className,
      )}
      style={style}
    >
      <p className="text-foreground">{title}</p>
      {content.mode === 'hero' ? (
        <HeroContent content={content} />
      ) : (
        <ListContent content={content} />
      )}
      {hint !== undefined && (
        <p className="mt-1 border-t border-border pt-1 text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
