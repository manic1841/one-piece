import { resetQaEnvironment } from './support/reset';

/**
 * Build a known-good emulator state once per run: wipe any leftover data, then
 * seed identity/whitelist (`qa:init`) and the deterministic financial dataset
 * (`qa:seed`). The emulator itself is assumed to be already running (started
 * externally, like the integration tests).
 *
 * State-mutating specs additionally reset in their own `beforeAll` so they can
 * be run standalone (see `e2e/support/reset.ts`).
 */
export default function globalSetup(): void {
  resetQaEnvironment();
}
