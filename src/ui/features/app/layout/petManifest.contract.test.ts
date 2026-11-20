import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PET_MOODS, type PetMood, isBaseMood } from '@/ui/features/app/types/petMood';

import { MAX_SHEET_WIDTH, framesPerSheet, petManifest, sheetSlice } from './petManifest';

/**
 * Contract test against the manifest that actually ships. `petManifest.test.ts`
 * uses a fixture, so a broken export would still pass there; this file fails the
 * build instead, and it needs no browser because it reads the bundled PNGs.
 */

const PET_DIR = join(process.cwd(), 'src/ui/features/app/layout/assets/pet');

/** PNG header: signature, then the IHDR chunk holding width and height. */
const pngSize = (path: string): { width: number; height: number } => {
  const header = readFileSync(path).subarray(0, 24);
  expect(header.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(header.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
};

describe('bundled pet manifest', () => {
  it('parses, and binds every mood the app has behaviour for', () => {
    expect(petManifest).not.toBeNull();
    for (const mood of PET_MOODS) {
      expect(petManifest?.bindings[mood]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('only binds animations that survived parsing', () => {
    for (const ids of Object.values(petManifest?.bindings ?? {})) {
      for (const id of ids) expect(petManifest?.animations.has(id)).toBe(true);
    }
  });

  it('matches each sheet to the canvas and the declared frame count', () => {
    const canvas = petManifest?.canvas;
    expect(canvas).toBeDefined();

    for (const animation of petManifest?.animations.values() ?? []) {
      const { width, height } = pngSize(join(PET_DIR, animation.sheet));

      expect(height).toBe(canvas?.height);
      expect(width).toBe((canvas?.width ?? 0) * animation.frameCount);
    }
  });

  it('keeps every override inside the strip', () => {
    for (const animation of petManifest?.animations.values() ?? []) {
      for (const key of Object.keys(animation.timing.overrideMs)) {
        expect(Number(key)).toBeLessThan(animation.frameCount);
      }
    }
  });

  it('makes a continuous mood with several bindings fully cycle', () => {
    for (const [mood, ids] of Object.entries(petManifest?.bindings ?? {})) {
      if (!isBaseMood(mood as PetMood) || ids.length < 2) continue;
      for (const id of ids) expect(petManifest?.animations.get(id)?.loop).toBe(false);
    }
  });

  it('loops only `sleep`, and only as its single candidate', () => {
    for (const [mood, ids] of Object.entries(petManifest?.bindings ?? {})) {
      for (const id of ids) {
        if (!petManifest?.animations.get(id)?.loop) continue;
        expect(mood).toBe('sleep');
        expect(ids).toHaveLength(1);
      }
    }
    // The contract exists so the pet can hold while asleep; keep it exercised.
    expect(petManifest?.animations.get(petManifest?.bindings.sleep?.[0] ?? '')?.loop).toBe(true);
  });

  it('binds every animation the export ships', () => {
    const bound = new Set(Object.values(petManifest?.bindings ?? {}).flat());
    for (const id of petManifest?.animations.keys() ?? []) {
      expect(bound.has(id)).toBe(true);
    }
  });

  it('keeps the anchor on the canvas', () => {
    const canvas = petManifest!.canvas;
    expect(canvas.anchor.x).toBeGreaterThanOrEqual(0);
    expect(canvas.anchor.x).toBeLessThanOrEqual(canvas.width);
    expect(canvas.anchor.y).toBeGreaterThanOrEqual(0);
    expect(canvas.anchor.y).toBeLessThanOrEqual(canvas.height);
  });

  it('keeps every drawn slice inside one raster', () => {
    const canvas = petManifest!.canvas;
    expect(canvas.width).toBeLessThanOrEqual(MAX_SHEET_WIDTH);

    for (const animation of petManifest?.animations.values() ?? []) {
      // The sheet itself may exceed the limit; the drawn window may not.
      expect(
        sheetSlice(animation, canvas, animation.frameCount - 1) * canvas.width,
      ).toBeLessThanOrEqual(MAX_SHEET_WIDTH);
      expect(framesPerSheet(canvas) * canvas.width).toBeLessThanOrEqual(MAX_SHEET_WIDTH);
    }
  });

  it('weights `rest` with the idle loop heaviest and `turn` lightest', () => {
    const rest = petManifest!.bindings.rest ?? [];
    const count = (id: string) => rest.filter((entry) => entry === id).length;

    expect(count('idle-right')).toBeGreaterThan(1);
    expect(count('turn')).toBe(1);
    for (const id of rest) {
      if (id === 'idle-right') continue;
      expect(count(id)).toBeLessThan(count('idle-right'));
    }
  });

  it('ships exactly the sheets the manifest names', () => {
    const named = [...petManifest!.animations.values()]
      .map((animation) => animation.sheet.replace('clips/', ''))
      .sort();

    expect(readdirSync(join(PET_DIR, 'clips')).sort()).toEqual(named);
  });
});
