import { readFileSync } from 'node:fs';
import path from 'node:path';

import { EMULATOR_API_KEY } from '../../scripts/qa/qa-identity';

/**
 * Guard test for the emulator API-key agreement (issue #284).
 *
 * The Firebase Auth SDK keys its persisted session as
 * `firebase:authUser:<apiKey>:…`, so the app's `firebaseConfig.apiKey` and the
 * E2E session installer must resolve the SAME key. When they disagree the app
 * finds no session, every spec dies at the login gate, and nothing says why
 * (PR #283). The key lives in one constant (`EMULATOR_API_KEY`); this locks the
 * files that also spell it out to that constant, and forbids the production key
 * from ever becoming the emulator key.
 */
const repoRoot = path.resolve(__dirname, '../..');

const read = (relativePath: string): string =>
  readFileSync(path.join(repoRoot, relativePath), 'utf8');

const extract = (source: string, pattern: RegExp, file: string): string => {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find the API key in ${file}; update this guard test.`);
  }
  return match[1].trim();
};

describe('emulator API-key agreement (issue #284)', () => {
  it('uses the shared emulator key in the app dev env', () => {
    const key = extract(
      read('.env.development'),
      /^VITE_FIREBASE_API_KEY=(.+)$/m,
      '.env.development',
    );
    expect(key).toBe(EMULATOR_API_KEY);
  });

  it('injects the shared emulator key into the app container', () => {
    const key = extract(
      read('docker-compose.yml'),
      /^\s*VITE_FIREBASE_API_KEY:\s*(.+)$/m,
      'docker-compose.yml',
    );
    expect(key).toBe(EMULATOR_API_KEY);
  });

  it('never lets the emulator key be the production key', () => {
    const productionKey = extract(
      read('.env.production'),
      /^VITE_FIREBASE_API_KEY=(.+)$/m,
      '.env.production',
    );
    expect(EMULATOR_API_KEY).not.toBe(productionKey);
  });

  it('makes the E2E session installer fall back to the emulator key, not a production key', () => {
    const helper = read('e2e/support/emulator.ts');
    expect(helper).toContain('EMULATOR_API_KEY');
    // A hardcoded production key here is the PR #283 regression: the app would
    // look under a different `<apiKey>` and never see the injected session.
    expect(helper).not.toMatch(/AIzaSy/);
  });

  it('makes the app fall back to the emulator key (never the production key) in emulator mode', () => {
    const app = read('src/firebase.ts');
    expect(extract(app, /const EMULATOR_API_KEY = '([^']+)'/, 'src/firebase.ts')).toBe(
      EMULATOR_API_KEY,
    );
    // Outside emulator mode the production fallback must still be the real
    // production key, not the emulator key.
    expect(extract(app, /const PRODUCTION_API_KEY = '([^']+)'/, 'src/firebase.ts')).toBe(
      extract(read('.env.production'), /^VITE_FIREBASE_API_KEY=(.+)$/m, '.env.production'),
    );
  });
});
