#!/usr/bin/env node
/**
 * Install the git pre-commit hook (issue #286).
 *
 * The `pre-commit` dependency cannot install its own hook here: pnpm 10 skips
 * dependency build scripts by default (see `ignoredBuilds` in
 * `node_modules/.modules.yaml`), and even when run its installer resolves `.git`
 * relative to pnpm's isolated store directory and silently bails. So we install
 * the hook ourselves, reusing the package's own hook script (which reads the
 * `pre-commit` array from package.json). Wired to the `prepare` script, so it
 * runs after `pnpm install`; a no-op outside a git checkout.
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

let hooksDir;
try {
  // Resolves the correct hooks path for both a normal clone and a worktree.
  hooksDir = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
    encoding: 'utf8',
  }).trim();
} catch {
  process.exit(0); // not a git checkout (e.g. a tarball install)
}

const require = createRequire(import.meta.url);
const hookSource = path.join(path.dirname(require.resolve('pre-commit')), 'hook');
const hookTarget = path.join(hooksDir, 'pre-commit');

mkdirSync(hooksDir, { recursive: true });
copyFileSync(hookSource, hookTarget);
chmodSync(hookTarget, 0o755);
console.log(`Installed git pre-commit hook → ${hookTarget}`);
