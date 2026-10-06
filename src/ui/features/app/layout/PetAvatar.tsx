import React, { useState } from 'react';

import type { PetReaction } from './petReaction';

/**
 * Pixel Pet art seam — the single place that decides *how a reaction is drawn*.
 *
 * Behaviour (which reaction is active) belongs to `petReaction.ts` +
 * `usePetReaction`; this component only maps a reaction to pixels. `PixelPet`
 * passes a `reaction` and stays unaware of assets.
 *
 * Art contract — drop one sheet per reaction into `./assets/pet/<reaction>/`
 * (the folder picks the reaction, so the filename is free; Vite imports it, so
 * it is fingerprinted and only the used ones ship):
 *   - the sheet is a strip of 48x48 frames laid out along one axis; the **number
 *     of frames is free** (`288x48` = 6 left-to-right, `48x288` = 6 top-to-bottom,
 *     `480x48` = 10, ...);
 *   - 48px matches the render size exactly, so the art is a 1:1 pixel match
 *     (crisp, no resampling);
 *   - transparent background, and a shared frame centre so reactions do not jump;
 *   - **frame 0 is the resting pose.** The global `prefers-reduced-motion` rule in
 *     `index.css` collapses the animation onto that frame, so no still frame is
 *     needed.
 * Reactions without a sheet fall back to the emoji placeholders below.
 */
const PET_FACES: Record<PetReaction, string> = {
  idle: '◡',
  happy: '◡‿◡',
  nod: '◠‿◠',
  alert: '⊙',
};

const PET_ALT: Record<PetReaction, string> = {
  idle: 'Pixel Pet 待機',
  happy: 'Pixel Pet 開心',
  nod: 'Pixel Pet 點頭',
  alert: 'Pixel Pet 注意',
};

/** How long one sprite frame is shown, in ms. */
const FRAME_MS = 120;

const PET_SHEETS = import.meta.glob('./assets/pet/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function sheetSource(reaction: PetReaction): string | undefined {
  const prefix = `./assets/pet/${reaction}/`;
  const match = Object.keys(PET_SHEETS)
    .filter((key) => key.startsWith(prefix))
    .sort()[0];
  return match ? PET_SHEETS[match] : undefined;
}

type Sprite = {
  src: string;
  frames: number;
  axis: 'x' | 'y';
};

type PetAvatarProps = {
  reaction: PetReaction;
};

const PetAvatar: React.FC<PetAvatarProps> = ({ reaction }) => {
  const sheet = sheetSource(reaction);
  const [sprite, setSprite] = useState<Sprite | null>(null);

  if (sheet) {
    // Always 48x48 frames; only the count varies, and the sheet states it: the
    // short side is one frame, the long side is the run of frames. That keeps the
    // art authoritative — a longer strip simply plays longer, with no code change.
    const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalWidth <= 0 || naturalHeight <= 0) return;
      const axis = naturalHeight > naturalWidth ? 'y' : 'x';
      const frame = Math.min(naturalWidth, naturalHeight);
      const run = Math.max(naturalWidth, naturalHeight);
      setSprite({ src: sheet, frames: Math.max(1, Math.round(run / frame)), axis });
    };

    const active = sprite && sprite.src === sheet ? sprite : null;
    // Until the sheet loads we still show frame 0, clipped from the natural-size
    // image (48px art, so that is already the render size).
    const frameClass = active === null ? '' : active.axis === 'y' ? 'w-12 h-auto' : 'h-12 w-auto';

    return (
      <span data-testid="pet-face" className="flex h-12 w-12 overflow-hidden">
        <img
          src={sheet}
          alt={PET_ALT[reaction]}
          draggable={false}
          onLoad={handleLoad}
          style={{
            imageRendering: 'pixelated',
            ...(active && active.frames > 1
              ? {
                  animationName: `pet-strip-${active.axis}`,
                  animationDuration: `${active.frames * FRAME_MS}ms`,
                  animationTimingFunction: `steps(${active.frames})`,
                  animationIterationCount: 'infinite',
                }
              : {}),
          }}
          className={`max-w-none select-none ${frameClass}`}
        />
      </span>
    );
  }

  return (
    <span data-testid="pet-face" className="text-primary text-xl leading-none select-none">
      {PET_FACES[reaction]}
    </span>
  );
};

export default PetAvatar;
