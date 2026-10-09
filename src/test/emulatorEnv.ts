/**
 * Emulator address resolution shared by integration test helpers.
 *
 * Tolerates an optional http(s):// prefix on host values, because the
 * browser-side firebase SDK expects the prefix while the Node SDK rejects
 * it. Defaults target published localhost ports, which resolve correctly
 * on CI runners, on host machines, and inside the Docker dev stack (where
 * compose injects the service-name env vars explicitly).
 *
 * Project namespace: integration tests wipe the emulator's Firestore with a
 * whole-project DELETE, so they run in their OWN project (INTEGRATION_FIREBASE_PROJECT_ID)
 * that the dev/QA/E2E environment never uses. That is why the project id below
 * ignores the ambient FIREBASE_PROJECT_ID (compose sets it to `demo-project`
 * for the dev stack): honoring it would point the wipe back at the QA data
 * (issue #208). Only the connection ADDRESS is environment-driven.
 */

export type EmulatorAddress = {
  host: string;
  port: number;
  baseUrl: string;
};

export const parseEmulatorAddress = (address: string, defaultPort: number): EmulatorAddress => {
  const url = new URL(address.includes('://') ? address : `http://${address}`);
  return {
    host: url.hostname,
    port: Number(url.port || defaultPort),
    baseUrl: url.origin,
  };
};

const runtimeEnv =
  (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env ?? {};

export const firestoreEmulator = parseEmulatorAddress(
  runtimeEnv.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
  8080,
);

export const authEmulator = parseEmulatorAddress(
  runtimeEnv.FIREBASE_AUTH_EMULATOR_HOST ?? 'http://127.0.0.1:9099',
  9099,
);

/**
 * The integration suite's dedicated Firestore project. The emulator isolates
 * data per project id, so the suite's whole-project DELETE can only ever touch
 * this namespace, never the dev/QA/E2E project (`demo-project`). A constant on
 * purpose: no env var can redirect the wipe back at real QA data (#208).
 */
export const INTEGRATION_FIREBASE_PROJECT_ID = 'demo-integration';

export const emulatorProjectId = INTEGRATION_FIREBASE_PROJECT_ID;

/**
 * Refuses to wipe any Firestore project other than the integration suite's own.
 * `resetMockDb()` runs it before every whole-project DELETE: if a future change
 * ever rewires `emulatorProjectId` (or an env override is reintroduced), the
 * wipe fails loudly instead of destroying the dev/QA environment (issue #208).
 */
export const assertIntegrationProject = (projectId: string): void => {
  if (projectId !== INTEGRATION_FIREBASE_PROJECT_ID) {
    throw new Error(
      `Refusing to wipe Firestore project "${projectId}": the integration suite may only ` +
        `wipe its own project "${INTEGRATION_FIREBASE_PROJECT_ID}" (issue #208).`,
    );
  }
};
