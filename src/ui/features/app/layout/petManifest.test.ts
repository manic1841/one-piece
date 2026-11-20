import { describe, expect, it } from 'vitest';

import {
  MAX_SHEET_WIDTH,
  flippedFacing,
  frameDelayMs,
  framesPerSheet,
  parsePetManifest,
  pickAnimation,
  sheetSlice,
} from './petManifest';

const SHEETS = {
  'clips/idle.png': 'url-idle',
  'clips/turn.png': 'url-turn',
};

const raw = (overrides: Record<string, unknown> = {}) => ({
  formatVersion: '2.0.0',
  target: 'pixel-pet',
  character: 'kirby',
  authoredFacing: 'right',
  canvas: { width: 60, height: 84, anchor: { x: 30, y: 76 } },
  animations: {
    idle: { sheet: 'clips/idle.png', frameCount: 4, timing: { frameMs: 80 }, loop: true },
    turn: {
      sheet: 'clips/turn.png',
      frameCount: 2,
      timing: { frameMs: 50 },
      loop: false,
      flipsFacing: true,
    },
  },
  bindings: { rest: ['idle'], celebrate: ['idle', 'turn'] },
  lock: { spriteForgeVersion: '0.1.0', exportedAt: '2026-11-13T00:00:00Z' },
  ...overrides,
});

describe('parsePetManifest', () => {
  it('reads canvas, animations and bindings from a valid manifest', () => {
    const manifest = parsePetManifest(raw(), SHEETS);

    expect(manifest?.canvas).toEqual({ width: 60, height: 84, anchor: { x: 30, y: 76 } });
    expect(manifest?.animations.get('turn')?.flipsFacing).toBe(true);
    expect(manifest?.bindings.celebrate).toEqual(['idle', 'turn']);
  });

  it('ignores fields it does not own', () => {
    expect(parsePetManifest(raw({ extra: true }), SHEETS)).not.toBeNull();
  });

  it('rejects a manifest from another major version', () => {
    expect(parsePetManifest(raw({ formatVersion: '1.0.0' }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ formatVersion: '3.0.0' }), SHEETS)).toBeNull();
  });

  it('accepts a newer minor', () => {
    expect(parsePetManifest(raw({ formatVersion: '2.4.0' }), SHEETS)).not.toBeNull();
  });

  it('rejects an unreadable facing or canvas', () => {
    expect(parsePetManifest(raw({ authoredFacing: 'up' }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ canvas: { width: 0, height: 84 } }), SHEETS)).toBeNull();
  });

  it('rejects an anchor outside the canvas', () => {
    expect(
      parsePetManifest(
        raw({ canvas: { width: 60, height: 84, anchor: { x: 61, y: 76 } } }),
        SHEETS,
      ),
    ).toBeNull();
    expect(
      parsePetManifest(
        raw({ canvas: { width: 60, height: 84, anchor: { x: 30, y: 85 } } }),
        SHEETS,
      ),
    ).toBeNull();
  });

  it('drops animations whose sheet did not ship', () => {
    const manifest = parsePetManifest(raw(), { 'clips/idle.png': 'url-idle' });

    expect(manifest?.animations.has('turn')).toBe(false);
  });

  it('fails when no animation survives', () => {
    expect(parsePetManifest(raw(), {})).toBeNull();
  });

  it('rejects a malformed animation or binding', () => {
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: { sheet: 'clips/idle.png', frameCount: 0, timing: { frameMs: 1 }, loop: true },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: { sheet: 'clips/idle.png', frameCount: 1, timing: {}, loop: true },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    // Overrides must sit inside the strip and stay positive.
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: {
              sheet: 'clips/idle.png',
              frameCount: 2,
              timing: { frameMs: 50, overrideMs: { '2': 60 } },
              loop: true,
            },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    expect(
      parsePetManifest(
        raw({
          animations: {
            idle: {
              sheet: 'clips/idle.png',
              frameCount: 2,
              timing: { frameMs: 50, overrideMs: { '01': 60 } },
              loop: true,
            },
          },
        }),
        SHEETS,
      ),
    ).toBeNull();
    expect(parsePetManifest(raw({ bindings: { rest: [] } }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ bindings: { rest: 'idle' } }), SHEETS)).toBeNull();
  });

  it('ignores a Situation this build has no behaviour for', () => {
    const manifest = parsePetManifest(
      raw({ bindings: { idle: ['idle'], rest: ['idle'] } }),
      SHEETS,
    );

    expect(manifest?.bindings).toEqual({ rest: ['idle'] });
  });

  it('still validates the value of an unknown Situation', () => {
    expect(parsePetManifest(raw({ bindings: { futureMood: 'not-an-array' } }), SHEETS)).toBeNull();
    expect(parsePetManifest(raw({ bindings: { futureMood: [] } }), SHEETS)).toBeNull();
  });
});

describe('sheetSlice', () => {
  const canvas = { width: 188, height: 96, anchor: { x: 94, y: 96 } };
  const long = {
    id: 'long',
    sheet: 'clips/idle.png',
    frameCount: 200,
    timing: { frameMs: 50, overrideMs: {} },
    loop: false,
    flipsFacing: false,
  };

  it('keeps every slice within the raster width limit', () => {
    const perSheet = framesPerSheet(canvas);
    expect(perSheet * canvas.width).toBeLessThanOrEqual(MAX_SHEET_WIDTH);
    expect(sheetSlice(long, canvas, long.frameCount - 1) * canvas.width).toBeLessThanOrEqual(
      MAX_SHEET_WIDTH,
    );
  });

  it('shortens only the last slice', () => {
    const perSheet = framesPerSheet(canvas);
    expect(sheetSlice(long, canvas, 0)).toBe(perSheet);
    expect(sheetSlice(long, canvas, perSheet)).toBe(perSheet);
    expect(sheetSlice(long, canvas, long.frameCount - 1)).toBe(long.frameCount % perSheet);
  });

  it('keeps a short strip on a single slice', () => {
    expect(sheetSlice({ ...long, frameCount: 3 }, canvas, 2)).toBe(3);
  });
});

describe('frameDelayMs', () => {
  it('uses the uniform delay except on overridden frames', () => {
    const animation = {
      id: 'idle',
      sheet: 'clips/idle.png',
      frameCount: 3,
      timing: { frameMs: 80, overrideMs: { '1': 120 } },
      loop: true,
      flipsFacing: false,
    };

    expect(frameDelayMs(animation, 0)).toBe(80);
    expect(frameDelayMs(animation, 1)).toBe(120);
    expect(frameDelayMs(animation, 2)).toBe(80);
  });
});

describe('pickAnimation', () => {
  const manifest = parsePetManifest(raw(), SHEETS);

  it('returns null for an unbound Situation', () => {
    expect(pickAnimation(manifest, 'alert')).toBeNull();
  });

  it('returns null without a manifest', () => {
    expect(pickAnimation(null, 'rest')).toBeNull();
  });

  it('picks among the bound animations by the supplied random', () => {
    expect(pickAnimation(manifest, 'celebrate', () => 0)?.id).toBe('idle');
    expect(pickAnimation(manifest, 'celebrate', () => 0.99)?.id).toBe('turn');
  });

  it('skips bindings that point at a dropped animation', () => {
    const partial = parsePetManifest(raw({ bindings: { celebrate: ['turn', 'idle'] } }), {
      'clips/idle.png': 'url-idle',
    });

    expect(pickAnimation(partial, 'celebrate')?.id).toBe('idle');
  });

  it('never picks the excluded animation while another is available', () => {
    expect(pickAnimation(manifest, 'celebrate', () => 0, 'idle')?.id).toBe('turn');
    expect(pickAnimation(manifest, 'celebrate', () => 0, 'turn')?.id).toBe('idle');
  });

  it('replays the only candidate when it is excluded', () => {
    expect(pickAnimation(manifest, 'rest', () => 0, 'idle')?.id).toBe('idle');
  });
});

describe('flippedFacing', () => {
  it('toggles the facing', () => {
    expect(flippedFacing('right')).toBe('left');
    expect(flippedFacing('left')).toBe('right');
  });
});
