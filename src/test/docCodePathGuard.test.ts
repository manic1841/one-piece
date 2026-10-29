import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Guard test for `scripts/check-doc-code-paths.mjs`.
 *
 * The point of the check is that a renamed folder cannot leave a dead backticked
 * path behind while every other gate stays green. These tests inject a single
 * bad citation into a throwaway fixture and assert the guard fails and names it,
 * then assert the real repo is clean — otherwise the rule is only prose.
 */
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts/check-doc-code-paths.mjs');

type RunResult = { status: number; output: string };

const runGuard = (targets: string[]): RunResult => {
  try {
    const output = execFileSync('node', [scriptPath, ...targets], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number | null; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
};

describe('docs:check dead code path guard', () => {
  let fixtureDir: string;

  const writeFixture = (name: string, body: string): string => {
    const filePath = path.join(fixtureDir, name);
    writeFileSync(filePath, body, 'utf8');
    return filePath;
  };

  beforeAll(() => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'docs-code-path-guard-'));
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('passes on the current repo docs', () => {
    const result = runGuard([]);
    expect(result.status).toBe(0);
    expect(result.output).toContain('docs:check code paths OK');
  });

  it('flags a missing source path and reports its location', () => {
    const filePath = writeFixture('dead-source.md', '實作見 `src/ui/nope/gone.ts`。\n');

    const result = runGuard([filePath]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('must not cite paths that do not exist');
    expect(result.output).toContain(`${filePath}:1:`);
    expect(result.output).toContain('src/ui/nope/gone.ts');
  });

  it('accepts an existing root-level file', () => {
    const filePath = writeFixture('root-file.md', '設定見 `package.json`。\n');

    expect(runGuard([filePath]).status).toBe(0);
  });

  it('skips a doc-relative bare name', () => {
    const filePath = writeFixture('relative.md', '見 `types.ts` 與 `ui/table`。\n');

    expect(runGuard([filePath]).status).toBe(0);
  });

  it('skips commands and placeholder paths', () => {
    const filePath = writeFixture(
      'placeholder.md',
      '跑 `pnpm docs:check`；在 `src/domains/{domain_name}/` 建立；多 context 另見 `src/<context>/docs/adr/`。\n',
    );

    expect(runGuard([filePath]).status).toBe(0);
  });

  it('skips a line marked as historical', () => {
    const filePath = writeFixture(
      'historical.md',
      '舊檔 `src/ui/constants/transaction/label.ts` 已移除。 <!-- docs:check-ignore -->\n',
    );

    expect(runGuard([filePath]).status).toBe(0);
  });

  it('recovers green once the citation is fixed', () => {
    const filePath = writeFixture('fixable.md', '實作見 `src/ui/nope.ts`。\n');
    expect(runGuard([filePath]).status).toBe(1);

    writeFileSync(filePath, '實作見 `src/App.tsx`。\n', 'utf8');
    expect(runGuard([filePath]).status).toBe(0);
  });
});
