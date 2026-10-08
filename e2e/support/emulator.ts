/**
 * Emulator targeting + the Auth emulator REST helpers used to mint sessions.
 *
 * SECURITY: everything here talks to the local Firebase emulator only
 * (`demo-project`, the public fake API key, the throwaway QA account). Never
 * point these at a production Firebase project, and never reuse a real user's
 * session here.
 */
import { QA_EMAIL, QA_HOUSEHOLD_ID, QA_PASSWORD } from '../../scripts/qa/qa-identity';
import { resolveEmulatorEnv } from '../../scripts/shared/emulator-env';

export { QA_EMAIL, QA_HOUSEHOLD_ID, QA_PASSWORD };

const emulatorTargets = resolveEmulatorEnv();

/** The app origin Playwright drives; must match `playwright.config.ts` webServer. */
export const APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? 'http://localhost:5173';

/** Auth emulator origin, reachable from the Playwright (Node) process. */
export const AUTH_EMULATOR_ORIGIN = emulatorTargets.authBaseUrl;

export const EMULATOR_PROJECT_ID = emulatorTargets.projectId;

/** Must equal the app's `firebaseConfig.apiKey`: it keys the Auth storage entry. */
export const APP_API_KEY =
  process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCm6Bu5ibGuY-oQXYMeprq0FV9lhy3EFKo';

export interface EmulatorSession {
  email: string;
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface IdentityToolkitResponse {
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  email: string;
}

const identityToolkit = async (
  endpoint: 'signUp' | 'signInWithPassword',
  email: string,
  password: string,
): Promise<IdentityToolkitResponse> => {
  const response = await fetch(
    `${AUTH_EMULATOR_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${APP_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Auth emulator ${endpoint} failed for ${email}: ${response.status} ${await response.text()}`,
    );
  }
  return (await response.json()) as IdentityToolkitResponse;
};

/** Create the account if missing, then sign in to obtain a fresh session. */
export const signInEmulatorUser = async (
  email: string,
  password: string,
): Promise<EmulatorSession> => {
  try {
    await identityToolkit('signUp', email, password);
  } catch {
    // Already registered from a previous run; signing in below is enough.
  }
  const result = await identityToolkit('signInWithPassword', email, password);
  return {
    email: result.email,
    localId: result.localId,
    idToken: result.idToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
};

/** A throwaway, non-whitelisted user, used to prove the access gate blocks. */
export const signInNonWhitelistedUser = (): Promise<EmulatorSession> =>
  signInEmulatorUser(`outsider-${Date.now()}@onepiece.test`, 'password123');
