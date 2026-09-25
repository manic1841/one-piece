/**
 * Shared emulator target resolution for admin/QA scripts.
 *
 * Reads FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST /
 * FIREBASE_PROJECT_ID, tolerating an optional http(s):// prefix on either
 * host value (the browser-side firebase SDK expects the prefix, the
 * Node firebase-admin SDK rejects it). Falls back to localhost ports and
 * always prints the resolved targets so a fallback is never silent.
 */

export type EmulatorTargets = {
  /** hostname only, e.g. "firebase" or "127.0.0.1" */
  firestoreHost: string;
  firestorePort: number;
  /** host:port, the format firebase-admin requires (no scheme) */
  firestoreAddress: string;
  /** host:port, the format firebase-admin requires (no scheme) */
  authAddress: string;
  /** http://host:port, for direct REST calls such as signInWithPassword */
  authBaseUrl: string;
  projectId: string;
};

const DEFAULTS = {
  firestoreHost: 'localhost',
  firestorePort: 8080,
  authHost: 'localhost',
  authPort: 9099,
  projectId: 'demo-project',
} as const;

const parseAddress = (raw: string, defaultPort: number): { host: string; port: number } => {
  const url = new URL(raw.includes('://') ? raw : `http://${raw}`);
  return { host: url.hostname, port: Number(url.port || defaultPort) };
};

export const resolveEmulatorEnv = (
  env: Record<string, string | undefined> = process.env,
): EmulatorTargets => {
  const firestoreRaw = env.FIRESTORE_EMULATOR_HOST;
  const authRaw = env.FIREBASE_AUTH_EMULATOR_HOST;
  const projectId = env.FIREBASE_PROJECT_ID ?? DEFAULTS.projectId;

  const firestore = parseAddress(
    firestoreRaw ?? `${DEFAULTS.firestoreHost}:${DEFAULTS.firestorePort}`,
    DEFAULTS.firestorePort,
  );
  const auth = parseAddress(
    authRaw ?? `${DEFAULTS.authHost}:${DEFAULTS.authPort}`,
    DEFAULTS.authPort,
  );

  return {
    firestoreHost: firestore.host,
    firestorePort: firestore.port,
    firestoreAddress: `${firestore.host}:${firestore.port}`,
    authAddress: `${auth.host}:${auth.port}`,
    authBaseUrl: `http://${auth.host}:${auth.port}`,
    projectId,
  };
};

/**
 * Resolves targets, applies them to process.env for firebase-admin,
 * and prints what was resolved (and whether a value was defaulted).
 */
export const applyEmulatorEnv = (log: (...args: unknown[]) => void = console.log): EmulatorTargets => {
  const targets = resolveEmulatorEnv();
  const source = (value: string | undefined) => (value ? 'from env' : 'defaulted');

  const firestoreRaw = process.env.FIRESTORE_EMULATOR_HOST;
  const authRaw = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const projectRaw = process.env.FIREBASE_PROJECT_ID;

  process.env.FIRESTORE_EMULATOR_HOST = targets.firestoreAddress;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = targets.authAddress;

  log('Emulator targets:');
  log(`  Firestore: ${targets.firestoreAddress} [${source(firestoreRaw)}]`);
  log(`  Auth:      ${targets.authBaseUrl} [${source(authRaw)}]`);
  log(`  Project:   ${targets.projectId} [${source(projectRaw)}]`);

  return targets;
};
