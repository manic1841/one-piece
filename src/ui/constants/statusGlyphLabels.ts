import { type StatusGlyphType } from '@/ui/components/StatusGlyph';

/** Screen-reader wording for each state; the glyph alone is not readable. */
export const STATUS_GLYPH_LABELS: Record<StatusGlyphType, string> = {
  active: 'ACTIVE',
  verified: 'VERIFIED',
  waiting: 'WAITING',
  review: 'REVIEW',
  error: 'ERROR',
  inactive: 'INACTIVE',
};
