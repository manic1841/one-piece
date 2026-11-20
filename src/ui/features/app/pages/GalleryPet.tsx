import React, { useState } from 'react';

import { eyebrowClass } from '@/ui/components/eyebrow';
import { Button } from '@/ui/components/ui/button';
import PetAvatar from '@/ui/features/app/layout/PetAvatar';
import { PET_HIT_AREA_CLASS } from '@/ui/features/app/layout/petChrome';
import { petManifest } from '@/ui/features/app/layout/petManifest';
import type { PetMood } from '@/ui/features/app/types/petMood';
import { cn } from '@/ui/utils/cn';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

/**
 * The two continuous moods plus the four one-shot events. Behaviour is pinned
 * here (a fixed `mood`), so the gallery shows art and timing only — the
 * priority/cooldown rules live in `petMood.ts`.
 */
const STATES: readonly { mood: PetMood; label: string }[] = [
  { mood: 'rest', label: 'rest · base' },
  { mood: 'sleep', label: 'sleep · base' },
  { mood: 'move', label: 'move · route change' },
  { mood: 'nod', label: 'nod · press pet' },
  { mood: 'celebrate', label: 'celebrate · write succeeded' },
  { mood: 'alert', label: 'alert · command failed' },
];

/** Only used when the manifest failed to parse and the placeholder is showing. */
const STAGE_FALLBACK = { width: 188, height: 96 };
const STAGE = petManifest?.canvas ?? STAGE_FALLBACK;
/**
 * One mood held still enough to inspect; `seq` replays a one-shot. `onEnd` is
 * left to the component's own no-op, so the inline callback cannot restart
 * playback on every frame.
 */
const PetStage: React.FC<{ mood: PetMood; label: string }> = ({ mood, label }) => {
  const [seq, setSeq] = useState(0);

  return (
    <div className="min-w-0">
      <div
        className="relative border border-border bg-background"
        style={{ width: STAGE.width, height: STAGE.height }}
      >
        <PetAvatar mood={mood} seq={seq} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={eyebrowClass}>{label}</span>
        <Button size="sm" variant="text" onClick={() => setSeq((current) => current + 1)}>
          Replay
        </Button>
      </div>
    </div>
  );
};

/**
 * Hit-area check: the button is the 44px targets the app uses, bottom-aligned
 * to the feet, with the art overhanging above it. The dot marks the left edge
 * of the button so the offset is visible.
 */
const HitAreaScene: React.FC = () => (
  <GalleryModule label="P02 · HIT AREA">
    <div className="relative h-40 border border-border bg-background">
      <div className="absolute bottom-4 left-20">
        <span className="text-muted-foreground absolute right-full top-2 mr-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-widest">
          ◂ target edge
        </span>
        <button
          type="button"
          aria-label="Pixel Pet hit area probe"
          className={cn(PET_HIT_AREA_CLASS, 'bg-primary/10 ring-1 ring-primary/40')}
        >
          <PetAvatar mood="rest" seq={0} />
        </button>
      </div>
    </div>
    <p className={cn(eyebrowClass, 'mt-3 leading-relaxed normal-case')}>
      44×44 target, bottom edge on the feet. The {STAGE.width}×{STAGE.height} canvas overhangs; the
      ring is only a probe — production keeps the ring for focus-visible only.
    </p>
  </GalleryModule>
);

export const GalleryPetBody: React.FC = () => (
  <>
    <GalleryGroup label="PIXEL PET" />
    <GallerySection number="38" title="Pixel Pet">
      <GalleryModule label="P01 · MOOD ART">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STATES.map(({ mood, label }) => (
            <PetStage key={mood} mood={mood} label={label} />
          ))}
        </div>
      </GalleryModule>
      <div className="mt-6">
        <HitAreaScene />
      </div>
      <GalleryCaption>
        Art and per-frame timing come from the export manifest; `rest` and `sleep` cycle their
        bindings when a one-shot finishes, the four reaction states fall back to the base. The pet
        faces left everywhere — a `turn` is the only animation that shows the other side, and it
        hands back to left on the next animation. Frames are drawn 1:1, so a mood never resamples.
        Reduced motion holds frame 0.
      </GalleryCaption>
    </GallerySection>
  </>
);
