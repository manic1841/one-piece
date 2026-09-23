import { cn } from '@/ui/utils/cn';

export type StatusGlyphType =
  | 'active'
  | 'verified'
  | 'waiting'
  | 'review'
  | 'error'
  | 'inactive';

type StatusGlyphProps = {
  type: StatusGlyphType;
  label?: string;
  className?: string;
};

const glyphMap: Record<StatusGlyphType, string> = {
  active: '●',
  verified: '✓',
  waiting: '○',
  review: '!',
  error: '×',
  inactive: '⊘',
};

const defaultLabelMap: Record<StatusGlyphType, string> = {
  active: 'ACTIVE',
  verified: 'VERIFIED',
  waiting: 'WAITING',
  review: 'REVIEW',
  error: 'ERROR',
  inactive: 'INACTIVE',
};

const colorMap: Record<StatusGlyphType, string> = {
  active: 'text-positive',
  verified: 'text-positive',
  waiting: 'text-muted-foreground',
  review: 'text-warning',
  error: 'text-negative',
  inactive: 'text-muted-foreground',
};

export function StatusGlyph({ type, label, className }: StatusGlyphProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span className={cn('text-[10px] leading-none', colorMap[type])}>{glyphMap[type]}</span>
      {(label ?? defaultLabelMap[type]) !== '' && (
        <span className="text-muted-foreground">{label ?? defaultLabelMap[type]}</span>
      )}
    </span>
  );
}
