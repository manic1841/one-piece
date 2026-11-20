import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PET_MOOD_LABELS } from '@/ui/constants/app/petLabels';
import { type PetMood, isBaseMood } from '@/ui/features/app/types/petMood';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';

import {
  type PetFacing,
  flippedFacing,
  frameDelayMs,
  petManifest,
  petSheetUrl,
  pickAnimation,
  sheetSlice,
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
 *   - the sheet keeps its natural size (1:1, no resampling) and is positioned by
 *     the canvas anchor so moods do not jump relative to each other; only the
 *     slice holding the current frame is painted, so `sleep`'s long strip never
 *     exceeds the browser's raster width;
 *   - the pet faces **left** by default (every animation is mirrored whenever
 *     Facing ≠ `authoredFacing`); a `flipsFacing` animation flips the held
 *     Facing when it ends, and that side is held for the animation that follows
 *     so the turn is actually seen before it snaps back to left;
 *   - a mood picks one bound animation per entry (`seq`), never per loop;
 *   - a continuous mood (`rest`, `sleep`) that finishes a one-shot animation
 *     picks another binding instead of reporting an end, so the pet keeps
 *     changing instead of freezing on a last frame; a `loop: true` animation
 *     holds forever without reporting an end, which is why only a single-
 *     candidate base mood may use it;
 *   - an event mood always reports `onEnd` when its animation finishes, even if
 *     the manifest marks it `loop: true`, so the controller can fall back.
 * Moods a manifest does not bind fall back to the emoji placeholders below.
 *
 * Asset contract: sprite-forge `docs/export-contract.md`; app-side rules in
 * `docs/ui/ui-layer-architecture.md` §6.2.
 */
type PetAvatarProps = {
  mood: PetMood;
  /** Changes on every accepted notification; replays the same animation. */
  seq: number;
  /** A one-shot animation finished; the controller returns to the base mood. */
  onEnd?: () => void;
};

/** Shared no-op so omitting `onEnd` keeps one stable identity for the effect. */
const NOOP = (): void => {};

/**
 * The pet is left-facing everywhere in the app.
 *
 * The export authors one direction, so "left" is achieved by mirroring; write it
 * literally rather than as the opposite of `authoredFacing`, because the rule is
 * about the app (always left), not about the export.
 */
const DEFAULT_FACING: PetFacing = 'left';

/** Where a finished animation leaves the facing: turned, or back to default. */
const settleFacing = (
  flipsFacing: boolean,
  facing: PetFacing,
): { facing: PetFacing; held: boolean } =>
  flipsFacing
    ? { facing: flippedFacing(facing), held: true }
    : { facing: DEFAULT_FACING, held: false };

type Playback = {
  key: string;
  frame: number;
  facing: PetFacing;
  /** The facing came from a turn and must survive the next entry. */
  held: boolean;
};

const PetAvatar: React.FC<PetAvatarProps> = ({ mood, seq, onEnd = NOOP }) => {
  const reduced = useReducedMotion();
  const base = isBaseMood(mood);

  // The effect must not depend on `onEnd`'s identity: a caller passing an inline
  // callback would otherwise restart playback on every re-render (frame 0 forever).
  const onEndRef = useRef(onEnd);
  const end = useCallback(() => onEndRef.current(), []);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // Each entry (`seq`) picks a fresh binding; a loop does not, because nothing
  // changes the key while it plays. `cycle` advances when a one-shot finishes
  // in a continuous mood, so the next binding is picked instead of freezing.
  const entryKey = `${mood}:${seq}`;
  const [entry, setEntry] = useState({
    key: entryKey,
    cycle: 0,
    animation: pickAnimation(petManifest, mood),
  });
  if (entry.key !== entryKey) {
    setEntry({
      key: entryKey,
      cycle: 0,
      animation: pickAnimation(petManifest, mood, Math.random, entry.animation?.id),
    });
  }
  const animation = entry.animation;

  const advanceCycle = useCallback(
    () =>
      setEntry((prev) =>
        prev.key === entryKey
          ? {
              key: prev.key,
              cycle: prev.cycle + 1,
              animation: pickAnimation(petManifest, mood, Math.random, prev.animation?.id),
            }
          : prev,
      ),
    [entryKey, mood],
  );

  // Frame 0 is the entry pose and the reduced-motion pose, so a change of
  // animation or motion preference resets playback during render (not in an
  // effect) and the timer only advances from there. A flip is applied on entry
  // under reduced motion (nothing ever finishes) and released with the pose.
  const playbackKey = `${animation?.id ?? 'none'}:${entryKey}:${entry.cycle}:${reduced}`;
  const resetPlayback = (prev: Playback): Playback => ({
    key: playbackKey,
    frame: 0,
    ...(reduced && animation !== null
      ? settleFacing(animation.flipsFacing, prev.facing)
      : { facing: prev.held ? prev.facing : DEFAULT_FACING, held: false }),
  });
  const [playback, setPlayback] = useState<Playback>(() =>
    resetPlayback({ key: playbackKey, frame: 0, facing: DEFAULT_FACING, held: false }),
  );
  if (playback.key !== playbackKey) setPlayback(resetPlayback(playback));

  useEffect(() => {
    // Nothing left to play: hand straight back so the mood cannot get stuck.
    if (animation === null) {
      end();
      return;
    }
    // Reduced motion settles on frame 0, and cycling would re-render forever.
    if (reduced || animation.frameCount < 2) {
      if (!base) end();
      return;
    }

    // Only a continuous mood may hold forever; an event must hand back.
    const loops = animation.loop && base;
    let index = 0;
    let timer = 0;
    const setFrame = (frame: number) =>
      setPlayback((prev) => (prev.key === playbackKey ? { ...prev, frame } : prev));
    const schedule = () => {
      const delay = frameDelayMs(animation, index);
      timer = window.setTimeout(() => {
        const next = index + 1;
        if (next >= animation.frameCount) {
          setPlayback((prev) =>
            prev.key === playbackKey
              ? { ...prev, ...settleFacing(animation.flipsFacing, prev.facing) }
              : prev,
          );
          if (loops) {
            index = 0;
          } else if (base) {
            advanceCycle();
            return;
          } else {
            end();
            return;
          }
        } else {
          index = next;
        }
        setFrame(index);
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [animation, base, reduced, playbackKey, end, advanceCycle]);

  const label = PET_MOOD_LABELS[mood];

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
  // A strip wider than one raster is drawn as slices: the element is only as wide
  // as its slice (so the browser never rasters past the limit) while the sheet
  // stays at its natural size, keeping every frame on the pixel grid.
  const frames = sheetSlice(animation, canvas, playback.frame);

  return (
    <span
      className="absolute select-none overflow-hidden"
      style={{
        width: canvas.width,
        height: canvas.height,
        // Anchor, not centre: the hit box's bottom edge is the pet's feet, so
        // the target covers the body instead of the empty space beneath it.
        left: `calc(50% - ${canvas.anchor.x}px)`,
        bottom: `${canvas.height - canvas.anchor.y}px`,
        transform: playback.facing === authoredFacing ? undefined : 'scaleX(-1)',
      }}
    >
      <span
        data-testid="pet-face"
        role="img"
        aria-label={label.alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: canvas.height,
          width: frames * canvas.width,
          backgroundImage: `url(${petSheetUrl(animation)})`,
          backgroundSize: `${animation.frameCount * canvas.width}px ${canvas.height}px`,
          // Absolute frame offset; the sheet keeps its natural size either way.
          backgroundPosition: `-${playback.frame * canvas.width}px 0`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    </span>
  );
};

export default PetAvatar;
