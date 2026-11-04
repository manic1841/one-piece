import { STATUS_GLYPH_LABELS } from '@/ui/constants/statusGlyphLabels';
import { cn } from '@/ui/utils/cn';

export type StatusGlyphType = 'active' | 'verified' | 'waiting' | 'review' | 'error' | 'inactive';

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
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        colorMap[type],
        className,
      )}
    >
      <span className="text-[11px] leading-none">{glyphMap[type]}</span>
      {(label ?? STATUS_GLYPH_LABELS[type]) !== '' && (
        <span>{label ?? STATUS_GLYPH_LABELS[type]}</span>
      )}
    </span>
  );
}
