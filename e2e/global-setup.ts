import { execFileSync } from 'node:child_process';

/**
 * Seed the emulator once per run: identity/whitelist (`qa:init`) then the
 * deterministic financial dataset (`qa:seed`). The emulator itself is assumed
 * to be already running (started externally, like the integration tests).
 */
export default function globalSetup(): void {
  const env = { ...process.env };
  for (const script of ['qa:init', 'qa:seed']) {
    execFileSync('pnpm', [script], { stdio: 'inherit', env });
  }
}
