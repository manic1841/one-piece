import React, { useEffect, useState } from 'react';

import type { PetMood } from '@/ui/hooks/petMood';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';

import {
  type PetFacing,
  flippedFacing,
  petManifest,
  petSheetUrl,
  pickAnimation,
} from './petManifest';

/**
 * Pixel Pet art seam — the single place that decides *how a mood is drawn*.
 *
 * Behaviour (which mood is active) belongs to `petMood.ts` + `usePetMood`; this
 * component only draws the animation the current mood binds to. `PixelPet`
 * passes a `mood` and stays unaware of art.
 *
 * The manifest owns frame size, count, timing, looping and facing:
 *   - frames are `canvas` sized and laid out left to right, so frame 0 is the
 *     resting pose the reduced-motion rule settles on;
 *   - the sheet is drawn at 1:1 (no resampling), positioned by the canvas
 *     anchor so moods do not jump relative to each other;
 *   - a `flipsFacing` animation flips the held Facing when it ends, and every
 *     animation is mirrored whenever Facing ≠ `authoredFacing`;
 *   - a mood picks one bound animation per entry (`seq`), never per loop;
 *   - a one-shot animation reports `onEnd` so the controller can fall back.
 * Moods a manifest does not bind fall back to the emoji placeholders below.
 *
 * Asset contract: sprite-forge `docs/export-contract.md`; app-side rules in
 * `docs/ui/ui-layer-architecture.md` §6.2.
 */
const PET_LABELS: Record<PetMood, { face: string; alt: string }> = {
  rest: { face: '◡', alt: 'Pixel Pet 待機' },
  sleep: { face: '–', alt: 'Pixel Pet 睡著' },
  move: { face: '→', alt: 'Pixel Pet 移動' },
  nod: { face: '◠', alt: 'Pixel Pet 點頭' },
  celebrate: { face: '★', alt: 'Pixel Pet 領獎' },
  alert: { face: '⊙', alt: 'Pixel Pet 注意' },
};

type PetAvatarProps = {
  mood: PetMood;
  /** Changes on every accepted notification; replays the same animation. */
  seq: number;
  /** A one-shot animation finished; the controller returns to the base mood. */
  onEnd: () => void;
};

const PetAvatar: React.FC<PetAvatarProps> = ({ mood, seq, onEnd }) => {
  const reduced = useReducedMotion();

  // Each entry (`seq`) picks a fresh binding; a loop does not, because nothing
  // changes the key while it plays.
  const entryKey = `${mood}:${seq}`;
  const [entry, setEntry] = useState({
    key: entryKey,
    animation: pickAnimation(petManifest, mood),
  });
  if (entry.key !== entryKey) {
    setEntry({ key: entryKey, animation: pickAnimation(petManifest, mood) });
  }
  const animation = entry.animation;

  // Frame 0 is the entry pose and the reduced-motion pose, so a change of
  // animation or motion preference resets playback during render (not in an
  // effect) and the timer only advances from there.
  const playbackKey = `${animation?.id ?? 'none'}:${entryKey}:${reduced}`;
  const [playback, setPlayback] = useState({ key: playbackKey, frame: 0 });
  if (playback.key !== playbackKey) setPlayback({ key: playbackKey, frame: 0 });

  const [facing, setFacing] = useState<PetFacing>(petManifest?.authoredFacing ?? 'right');

  // Reduced motion never reaches the end of a one-shot, so the flip it would
  // have applied on completion is applied on entry instead.
  const [flippedFor, setFlippedFor] = useState<string | null>(null);
  if (reduced && flippedFor !== playbackKey) {
    setFlippedFor(playbackKey);
    if (animation !== null && animation.flipsFacing) {
      setFacing(flippedFacing);
    }
  }

  useEffect(() => {
    // Nothing left to play: hand straight back so the mood cannot get stuck.
    if (animation === null || reduced || animation.frameCount < 2) {
      onEnd();
      return;
    }

    let index = 0;
    let timer = 0;
    const advance = (frame: number) =>
      setPlayback((prev) => (prev.key === playbackKey ? { key: playbackKey, frame } : prev));
    const schedule = () => {
      const delay = animation.delaysMs[index] ?? animation.delaysMs[animation.delaysMs.length - 1];
      timer = window.setTimeout(() => {
        const next = index + 1;
        if (next >= animation.frameCount) {
          if (!animation.loop) {
            if (animation.flipsFacing) setFacing(flippedFacing);
            onEnd();
            return;
          }
          index = 0;
        } else {
          index = next;
        }
        advance(index);
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [animation, reduced, playbackKey, onEnd]);

  const label = PET_LABELS[mood];

  if (animation === null || petManifest === null) {
    return (
      <span
        data-testid="pet-face"
        role="img"
        aria-label={label.alt}
        className="text-primary text-xl leading-none select-none"
      >
        {label.face}
      </span>
    );
  }

  const { canvas, authoredFacing } = petManifest;
  const frame = playback.frame;

  return (
    <span
      data-testid="pet-face"
      role="img"
      aria-label={label.alt}
      className="absolute select-none"
      style={{
        width: canvas.width,
        height: canvas.height,
        left: `calc(50% - ${canvas.anchor.x}px)`,
        top: `calc(50% - ${canvas.anchor.y}px)`,
        backgroundImage: `url(${petSheetUrl(animation)})`,
        backgroundSize: `${animation.frameCount * canvas.width}px ${canvas.height}px`,
        backgroundPosition: `-${frame * canvas.width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transform: facing === authoredFacing ? undefined : 'scaleX(-1)',
      }}
    />
  );
};

export default PetAvatar;
