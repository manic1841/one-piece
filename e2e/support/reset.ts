import { execFileSync } from 'node:child_process';

import { QA_HOUSEHOLD_ID } from '../../scripts/qa/qa-identity';
import { resolveEmulatorEnv } from '../../scripts/shared/emulator-env';

/**
 * Issue a synchronous DELETE against the Firestore emulator, returning the HTTP
 * status. Kept on `curl` so it behaves identically to `resetMockDb` and needs no
 * async plumbing inside Playwright's `globalSetup`/`beforeAll`.
 */
const deleteFirestoreData = (url: string): number => {
  const output = execFileSync(
    'curl',
    ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'DELETE', url],
    { encoding: 'utf8' },
  );
  return Number(output.trim());
};

/**
 * Full QA-environment reset for E2E: wipe the emulator's Firestore data, then
 * rebuild identity + seed (`qa:init` → `qa:seed`).
 *
 * Why a wipe: `qa:seed` writes with `merge: true`, so it overwrites the fields
 * it owns but NEVER deletes documents a spec created. Any spec that changes
 * state (closing a period, reopening one) would otherwise leak that state into
 * the next run and into other specs. Wiping first makes every state-mutating
 * spec independently runnable and order-independent.
 *
 * ⚠️ LOUD ON PURPOSE: this deletes ALL Firestore data in the emulator project.
 * The integration suite performs the same wipe but does NOT restore afterwards
 * (see issue #208); E2E restores immediately, so the environment ends in a
 * known-good state. The warning below is printed so a wipe is never silent.
 */
export const resetQaEnvironment = (): void => {
  const { firestoreHost, firestorePort, projectId } = resolveEmulatorEnv();
  const wipeUrl = `http://${firestoreHost}:${firestorePort}/emulator/v1/projects/${projectId}/databases/(default)/documents`;

  console.warn(
    `\n⚠️  E2E reset: wiping ALL Firestore data in emulator project "${projectId}" ` +
      `(${wipeUrl}), then rebuilding via qa:init + qa:seed.\n`,
  );

  const status = deleteFirestoreData(wipeUrl);
  if (status !== 200) {
    throw new Error(
      `E2E reset: Firestore wipe failed with HTTP ${status}. Is the Firebase emulator running?`,
    );
  }

  const env = { ...process.env };
  for (const script of ['qa:init', 'qa:seed']) {
    execFileSync('pnpm', [script], { stdio: 'inherit', env });
  }

  console.warn(`✅ E2E reset complete: emulator project "${projectId}" reseeded.\n`);
};

/**
 * Count the account snapshots persisted under one account's snapshot
 * collection. Uses the Firestore REST API (the `/emulator/v1/.../documents`
 * path only supports the DELETE-all wipe, not listing). Used to assert that a
 * repeated stage confirmation upserts (one doc per period) instead of appending.
 */
export const countAccountSnapshots = async (accountId: string): Promise<number> => {
  const { firestoreHost, firestorePort, projectId } = resolveEmulatorEnv();
  const url =
    `http://${firestoreHost}:${firestorePort}/v1/projects/${projectId}` +
    `/databases/(default)/documents/households/${QA_HOUSEHOLD_ID}/accounts/${accountId}/snapshots`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to read snapshots for ${accountId}: HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { documents?: unknown[] };
  return payload.documents?.length ?? 0;
};
