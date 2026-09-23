import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Guard test for `scripts/check-doc-references.sh` (issue #164).
 *
 * The staging-reference rule only has teeth if the guard actually fails on a
 * violation. These tests inject a single violating line into a throwaway fixture
 * and assert the guard exits non-zero AND reports the offending location, then
 * assert a clean fixture (and the real repo) go green. This proves the regex
 * extension works, not merely that the rule text changed.
 */
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts/check-doc-references.sh');

type RunResult = { status: number; output: string };

const runGuard = (targets: string[]): RunResult => {
  try {
    const output = execFileSync('bash', [scriptPath, ...targets], {
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

const VIOLATIONS: Array<{ label: string; body: string }> = [
  { label: 'the staging folder path', body: '詳見 docs/new-design/spec.md 的說明\n' },
  { label: 'the underscored staging folder', body: '詳見 new_design/plan.md 的說明\n' },
  { label: 'the spec package name', body: '定義見 one-piece-engineering-spec-v1\n' },
  { label: 'a staging filename', body: 'gallery rules live in visual-consistency.md §11\n' },
  { label: 'the page-review- prefix', body: '發現見 page-review-gaps.md\n' },
  { label: 'task-plans.md', body: '排程見 task-plans.md\n' },
  { label: 'an NN_Title.md spec file', body: '元件清單明言於 08_Component_Design.md\n' },
  { label: 'an indirect spec citation', body: 'portfolio 價值公式（spec 11）\n' },
  { label: 'an uppercase indirect citation', body: 'the spec said (Spec 11) once\n' },
];

describe('docs:check staging-reference guard (issue #164)', () => {
  let fixtureDir: string;

  const writeFixture = (name: string, body: string): string => {
    const filePath = path.join(fixtureDir, name);
    writeFileSync(filePath, body, 'utf8');
    return filePath;
  };

  beforeAll(() => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'docs-check-guard-'));
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('passes on the current repo docs', () => {
    const result = runGuard([]);
    expect(result.output).toContain('docs:check OK');
    expect(result.status).toBe(0);
  });

  it.each(VIOLATIONS)('flags $label and reports its location', ({ label, body }) => {
    const slug = label.replace(/[^a-z0-9]+/gi, '-');
    const filePath = writeFixture(`violation-${slug}.md`, body);

    const result = runGuard([filePath]);

    expect(result.status).toBe(1);
    expect(result.output).toContain('must not reference the design staging area');
    expect(result.output).toContain(filePath);
    expect(result.output).toContain(':1:');
  });

  it('does not block prototype branch pointers', () => {
    const filePath = writeFixture(
      'prototype-pointer.md',
      '原型在 prototype/one-piece-spec-v1 分支上；skill 見 .agents/skills/prototype/\n' +
        '另一條分支命名為 prototype/one-piece-engineering-spec-v1，仍不得被攔阻。\n',
    );

    const result = runGuard([filePath]);

    expect(result.output).toContain('docs:check OK');
    expect(result.status).toBe(0);
  });

  it('recovers green once the violation is removed', () => {
    const filePath = writeFixture('removable.md', '乾淨內容\n');
    expect(runGuard([filePath]).status).toBe(0);

    writeFileSync(filePath, '設計暫置區見 task-plans.md\n', 'utf8');
    expect(runGuard([filePath]).status).toBe(1);

    writeFileSync(filePath, '乾淨內容\n', 'utf8');
    expect(runGuard([filePath]).status).toBe(0);
  });
});
