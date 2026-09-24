import { type StatusGlyphType } from '@/ui/components/StatusGlyph';
import { useDashboardCloseStatus } from '@/ui/features/dashboard/hooks/useDashboardCloseStatus';

import type { PetReaction } from '../layout/petReaction';

const REACTION_BY_GLYPH: Record<StatusGlyphType, PetReaction> = {
  verified: 'happy',
  review: 'alert',
  active: 'nod',
  waiting: 'idle',
  error: 'idle',
  inactive: 'idle',
};

export function usePetReaction(householdId: string | undefined): PetReaction {
  const { vm } = useDashboardCloseStatus(householdId);

  if (!vm) return 'idle';

  return REACTION_BY_GLYPH[vm.glyphType];
}
