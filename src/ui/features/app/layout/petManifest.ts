/**
 * Pixel Pet manifest reader — the only place that turns a sprite-forge export
 * into something the app can draw.
 *
 * The export is authoritative: frame size, frame count, timing, looping and
 * which animation a Situation may play all come from `manifest.json`. Nothing
 * is inferred from the image. Behaviour (which Situation is active) still lives
 * `petMood.ts`; this module only reads art metadata.
 *
 * A malformed manifest makes the whole pet fall back to the emoji placeholders
 * instead of half-rendering: one bad field must not leave a broken strip on
 * screen.
 *
 * Contract: sprite-forge `docs/export-contract.md` (format 2.x); app-side rules
 * in `docs/ui/ui-layer-architecture.md` §6.2.
 */
import { PET_MOODS, type PetMood } from '@/ui/features/app/types/petMood';

import manifestJson from './assets/pet/manifest.json';

export type PetFacing = 'left' | 'right';

export type PetCanvas = {
  width: number;
  height: number;
  anchor: { x: number; y: number };
};

export type PetTiming = {
  /** Uniform per-frame duration. */
  frameMs: number;
  /** Sparse overrides, keyed by decimal frame index; absent keys use `frameMs`. */
  overrideMs: Readonly<Record<string, number>>;
};

export type PetAnimation = {
  id: string;
  sheet: string;
  frameCount: number;
  timing: PetTiming;
  loop: boolean;
  flipsFacing: boolean;
};

export type PetManifest = {
  canvas: PetCanvas;
  authoredFacing: PetFacing;
  animations: ReadonlyMap<string, PetAnimation>;
  /** Situation → animation ids. `PetMood` is the app's only Situation set. */
  bindings: Readonly<Partial<Record<PetMood, readonly string[]>>>;
};

/** Bumped only on a breaking contract change; readers accept the same major. */
const SUPPORTED_MAJOR = '2';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isFacing = (value: unknown): value is PetFacing => value === 'left' || value === 'right';

/** A Situation the app has behaviour for; other keys are an export mismatch. */
const isPetMood = (value: string): value is PetMood =>
  (PET_MOODS as readonly string[]).includes(value);

function parseCanvas(raw: unknown): PetCanvas | null {
  if (!isRecord(raw) || !isPositiveInt(raw.width) || !isPositiveInt(raw.height)) return null;
  const anchor = raw.anchor;
  if (!isRecord(anchor) || !isNonNegativeInt(anchor.x) || !isNonNegativeInt(anchor.y)) return null;
  // The hit box hangs off the anchor, so it must sit on the canvas.
  if (anchor.x > raw.width || anchor.y > raw.height) return null;
  return { width: raw.width, height: raw.height, anchor: { x: anchor.x, y: anchor.y } };
}

const isFrameIndex = (key: string, frameCount: number): boolean =>
  String(Number(key)) === key && Number(key) >= 0 && Number(key) < frameCount;

function parseTiming(raw: unknown, frameCount: number): PetTiming | null {
  if (!isRecord(raw) || !isPositiveInt(raw.frameMs)) return null;
  const overrideMs: Record<string, number> = {};
  if (raw.overrideMs !== undefined) {
    if (!isRecord(raw.overrideMs)) return null;
    for (const [key, value] of Object.entries(raw.overrideMs)) {
      if (!isFrameIndex(key, frameCount) || !isPositiveInt(value)) return null;
      overrideMs[key] = value;
    }
  }
  return { frameMs: raw.frameMs, overrideMs };
}

function parseAnimation(id: string, raw: unknown): PetAnimation | null {
  if (!isRecord(raw)) return null;
  const { sheet, frameCount, loop, flipsFacing } = raw;
  if (typeof sheet !== 'string' || sheet === '') return null;
  if (!isPositiveInt(frameCount)) return null;
  const timing = parseTiming(raw.timing, frameCount);
  if (timing === null) return null;
  if (typeof loop !== 'boolean') return null;
  if (flipsFacing !== undefined && typeof flipsFacing !== 'boolean') return null;
  return {
    id,
    sheet,
    frameCount,
    timing,
    loop,
    flipsFacing: flipsFacing === true,
  };
}

/**
 * @param raw parsed `manifest.json`
 * @param sheets sheet path (as written in the manifest, e.g. `clips/idle.png`)
 *   to bundled URL; animations whose sheet is missing are dropped.
 */
export function parsePetManifest(
  raw: unknown,
  sheets: Readonly<Record<string, string>>,
): PetManifest | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.formatVersion !== 'string') return null;
  if (raw.formatVersion.split('.')[0] !== SUPPORTED_MAJOR) return null;
  if (!isFacing(raw.authoredFacing)) return null;
  const canvas = parseCanvas(raw.canvas);
  if (canvas === null) return null;

  if (!isRecord(raw.animations) || Object.keys(raw.animations).length === 0) return null;
  const animations = new Map<string, PetAnimation>();
  for (const [id, value] of Object.entries(raw.animations)) {
    const animation = parseAnimation(id, value);
    if (animation !== null && sheets[animation.sheet] !== undefined) {
      animations.set(id, animation);
    }
  }
  if (animations.size === 0) return null;

  if (!isRecord(raw.bindings)) return null;
  const bindings: Partial<Record<PetMood, readonly string[]>> = {};
  for (const [situation, ids] of Object.entries(raw.bindings)) {
    // Values are checked first: an unknown Situation is ignored, but its value
    // still has to be well formed.
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
      return null;
    }
    // A newer minor may export a Situation this build has no behaviour for.
    if (!isPetMood(situation)) continue;
    bindings[situation] = ids as string[];
  }

  return { canvas, authoredFacing: raw.authoredFacing, animations, bindings };
}

/**
 * One animation for entering `mood`, or the next one when one finishes.
 *
 * `exclude` (the animation already on screen) keeps a cycle from repeating
 * itself; when it is the only candidate it replays anyway. Unbound moods (and
 * bindings pointing at missing animations) yield `null` so the caller can fall
 * back to the placeholder.
 */
export function pickAnimation(
  manifest: PetManifest | null,
  mood: PetMood,
  random: () => number = Math.random,
  exclude?: string,
): PetAnimation | null {
  if (manifest === null) return null;
  const candidates = (manifest.bindings[mood] ?? [])
    .map((id) => manifest.animations.get(id))
    .filter((animation): animation is PetAnimation => animation !== undefined);
  if (candidates.length === 0) return null;
  const pool =
    exclude === undefined ? candidates : candidates.filter((animation) => animation.id !== exclude);
  const choices = pool.length > 0 ? pool : candidates;
  return choices[Math.floor(random() * choices.length)] ?? choices[0];
}

/** How long frame `index` is held: its override if any, else the uniform value. */
export const frameDelayMs = (animation: PetAnimation, index: number): number =>
  animation.timing.overrideMs[String(index)] ?? animation.timing.frameMs;

/**
 * Widest raster a single `<img>`/background can hold. Browsers refuse or
 * downsample anything wider, which would break the 1:1 pixel grid, so a long
 * strip is drawn as consecutive slices rather than one background.
 */
export const MAX_SHEET_WIDTH = 16_384;

/** Whole frames that fit in one slice; at least one, even for a wide canvas. */
export const framesPerSheet = (canvas: PetCanvas): number =>
  Math.max(1, Math.floor(MAX_SHEET_WIDTH / canvas.width));

/** Frames carried by the slice that holds frame `index` (the last one is short). */
export const sheetSlice = (animation: PetAnimation, canvas: PetCanvas, index: number): number => {
  const perSheet = framesPerSheet(canvas);
  const shelf = Math.floor(index / perSheet);
  return Math.min(perSheet, animation.frameCount - shelf * perSheet);
};

export const flippedFacing = (facing: PetFacing): PetFacing =>
  facing === 'left' ? 'right' : 'left';

// Vite bundles the sheet URLs; the manifest only names them, so a sheet that an
// export references but did not ship fails the parse above instead of 404ing.
const SHEETS = import.meta.glob('./assets/pet/clips/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const SHEET_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(SHEETS).map(([key, url]) => [key.replace('./assets/pet/', ''), url]),
);

export const petManifest = parsePetManifest(manifestJson, SHEET_URLS);

/** Bundled URL of an animation's sheet. */
export const petSheetUrl = (animation: PetAnimation): string => SHEET_URLS[animation.sheet];
