import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Component catalog contract (issue #242).
 *
 * The catalog is asserted at text level against the filesystem so that adding or
 * removing a file without classifying it in the catalog fails the build, in both
 * directions:
 *   - every shared component (`*.tsx`) must appear in the index table;
 *   - every other module (`*.ts`) must appear in the non-component table.
 * Nothing under `src/ui/components/` may stay unclassified.
 */
const COMPONENTS_DIR = path.resolve(__dirname);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CATALOG_PATH = path.join(REPO_ROOT, 'docs/ui/component-catalog.md');

const TEST_FILE_PATTERN = /\.test\.(ts|tsx)$/;
const COMPONENT_ROW_PATTERN = /^\|\s*`(src\/ui\/components\/[^`]+\.tsx)`\s*\|/;
const MODULE_ROW_PATTERN = /^\|\s*`(src\/ui\/components\/[^`]+\.ts)`\s*\|/;

const collectFiles = (dir: string, keep: (entry: string) => boolean): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) return collectFiles(entryPath, keep);
    if (TEST_FILE_PATTERN.test(entry) || !keep(entry)) return [];
    return [path.relative(REPO_ROOT, entryPath)];
  });
};

const parseColumn = (markdown: string, pattern: RegExp): string[] => {
  return markdown
    .split('\n')
    .map((line) => line.match(pattern))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => match[1]);
};

const describeSet = (label: string, expected: string[], actual: string[]): [string, string[]][] => [
  [`${label} missing from catalog`, expected.filter((file) => !actual.includes(file)).sort()],
  [`${label} listed but absent on disk`, actual.filter((file) => !expected.includes(file)).sort()],
];

describe('component catalog completeness (issue #242)', () => {
  const markdown = readFileSync(CATALOG_PATH, 'utf8');
  const componentFiles = collectFiles(COMPONENTS_DIR, (entry) => entry.endsWith('.tsx'));
  const moduleFiles = collectFiles(COMPONENTS_DIR, (entry) => entry.endsWith('.ts'));
  const indexedComponents = parseColumn(markdown, COMPONENT_ROW_PATTERN);
  const indexedModules = parseColumn(markdown, MODULE_ROW_PATTERN);

  it('discovers files to classify', () => {
    expect(componentFiles.length).toBeGreaterThan(40);
    expect(moduleFiles.length).toBeGreaterThan(5);
  });

  it('parses plausible index tables (guards against a silent parse failure)', () => {
    expect(indexedComponents.length).toBeGreaterThan(40);
    expect(indexedModules.length).toBe(moduleFiles.length);
  });

  it.each([
    ...describeSet('component', componentFiles, indexedComponents),
    ...describeSet('module', moduleFiles, indexedModules),
  ])('%s', (_label, files) => {
    expect(files).toEqual([]);
  });

  it('lists each file exactly once', () => {
    const counts = new Map<string, number>();
    for (const file of [...indexedComponents, ...indexedModules]) {
      counts.set(file, (counts.get(file) ?? 0) + 1);
    }
    const duplicated = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([file]) => file)
      .sort();
    expect(duplicated).toEqual([]);
  });
});
