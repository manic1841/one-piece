/**
 * Emulator address resolution shared by integration test helpers.
 *
 * Tolerates an optional http(s):// prefix on host values, because the
 * browser-side firebase SDK expects the prefix while the Node SDK rejects
 * it. Defaults target published localhost ports, which resolve correctly
 * on CI runners, on host machines, and inside the Docker dev stack (where
 * compose injects the service-name env vars explicitly).
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

export const emulatorProjectId = runtimeEnv.FIREBASE_PROJECT_ID ?? 'demo-project';
