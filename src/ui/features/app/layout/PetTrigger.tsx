import React from 'react';

import { PET_TRIGGER_LABEL } from '@/ui/constants/app/petLabels';
import type { PetMood } from '@/ui/features/app/types/petMood';

import PetAvatar from './PetAvatar';
import { PET_FAB_CLASS } from './petChrome';

type PetTriggerProps = {
  mood: PetMood;
  seq: number;
  onEnd?: () => void;
  expanded: boolean;
  onClick: () => void;
};

/** The pet button: one shape for both shells, differing only in `onClick`. */
const PetTrigger = React.forwardRef<HTMLButtonElement, PetTriggerProps>(
  ({ mood, seq, onEnd, expanded, onClick }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={PET_TRIGGER_LABEL}
      aria-expanded={expanded}
      // Test hook for the mood the controller is currently showing.
      data-mood={mood}
      onClick={onClick}
      className={PET_FAB_CLASS}
    >
      <PetAvatar mood={mood} seq={seq} onEnd={onEnd} />
    </button>
  ),
);

PetTrigger.displayName = 'PetTrigger';

export default PetTrigger;
