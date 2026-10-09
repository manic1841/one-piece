import { describe, expect, it } from 'vitest';

import {
  INTEGRATION_FIREBASE_PROJECT_ID,
  assertIntegrationProject,
  emulatorProjectId,
} from './emulatorEnv';

/**
 * Issue #208: the integration suite wipes the whole emulator project, so it
 * must run in its own namespace — never `demo-project`, which the dev stack,
 * QA seed, and E2E suite share.
 */
describe('integration emulator project namespace', () => {
  it('resolves to the dedicated integration project, not the dev/QA one', () => {
    expect(INTEGRATION_FIREBASE_PROJECT_ID).toBe('demo-integration');
    expect(emulatorProjectId).toBe(INTEGRATION_FIREBASE_PROJECT_ID);
  });

  it('allows wiping only the integration project', () => {
    expect(() => assertIntegrationProject(INTEGRATION_FIREBASE_PROJECT_ID)).not.toThrow();
  });

  it('refuses to wipe any other project', () => {
    expect(() => assertIntegrationProject('demo-project')).toThrow(/issue #208/);
  });
});
