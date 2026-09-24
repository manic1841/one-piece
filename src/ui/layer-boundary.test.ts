import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * UI layer boundary contract (issue #178): ADR-0062 tier separation.
 *
 * Two rule families, both decided by **import path** (never by type identity):
 *
 *  1. Surface must not import `@/domains`, `@/application` or `@/infra` — types included — nor the
 *     Firebase SDK directly. The SDK is infrastructure, so the ban has no exception.
 *     Surface is the **fail-closed default**: membership is decided by directory, not file
 *     role, so any file under `src/ui` that is not inside a listed non-Surface directory is
 *     Surface. A new directory is Surface until the tier table names it.
 *  2. Controller (`hooks`, `contexts`) must not import repositories, Firestore or infra. There is
 *     **no exception any more**: the Firebase-free auth context reader that used to live in
 *     `src/infra` is now UI-owned (`src/ui/contexts`, see issue #177), so nothing in `src/ui`
 *     needs `@/infra` at all.
 *  3. Display Labels (`constants`) may read domain values and types, but must not reach
 *     `@/application` or `@/infra` (its import scope equals ViewModel's, minus behaviour).
 *  4. Composition root: exactly one file outside the UI tree may straddle layers (`src/App.tsx`,
 *     which injects the infra auth gateway into the UI provider). Anything else is a violation.
 *
 * Sources are asserted at text level (as in `design-contract.test.ts`), but every specifier is
 * **resolved to a path** first so alias and relative spellings are judged identically.
 */
const UI_DIR = path.resolve(__dirname);
const SRC_DIR = path.resolve(UI_DIR, '..');
const REPO_ROOT = path.resolve(SRC_DIR, '..');

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;

/** `from '…'`, `import('…')` and `require('…')`. */
const SPECIFIER_PATTERN = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;

/**
 * Directories that are explicitly NOT Surface (ADR-0062 §2 tier table).
 * Everything else under `src/ui` falls back to Surface.
 */
const NON_SURFACE_DIRS = [
  path.join(UI_DIR, 'hooks'), // Controller
  path.join(UI_DIR, 'contexts'), // Controller (auth state context + provider)
  path.join(UI_DIR, 'constants'), // Display Labels
  path.join(UI_DIR, 'utils'), // Presentation Helper
  path.join(UI_DIR, 'assets'),
];

/** Tiers nested inside a feature, e.g. `features/<name>/hooks`. */
const NON_SURFACE_FEATURE_DIRS = ['hooks', 'contexts', 'viewmodels', 'mappers', 'types', 'utils'];

/**
 * The Firebase SDK is infrastructure too, so no UI tier may reach it directly, and no UI tier
 * needs `@/infra` at all: the auth gateway is injected from the composition root (issue #177).
 */
const FIREBASE_SPECIFIER_PATTERN = /^firebase(\/|$)/;
const INFRA_ROOT = path.join(SRC_DIR, 'infra');

/**
 * Files outside the UI tree that are allowed to straddle layers. There is exactly one: the
 * composition root, which wires the infra auth gateway into the UI-owned provider.
 * The rule is set equality in both directions, so a stale entry fails too.
 */
const COMPOSITION_ROOT_ALLOWLIST = new Set(['src/App.tsx']);

/** The layer roots a `src/` top-level file might straddle. */
const LAYER_ROOTS = ['ui', 'domains', 'application', 'infra'].map((name) => path.join(SRC_DIR, name));

/** Importing any of these roots is reaching out of the UI tree. */
const FORBIDDEN_ROOTS = [
  path.join(SRC_DIR, 'domains'),
  path.join(SRC_DIR, 'application'),
  path.join(SRC_DIR, 'infra'),
];

/** Application + infra: what Display Labels may never read (domain values and types are fine). */
const BEHAVIOUR_ROOTS = [path.join(SRC_DIR, 'application'), path.join(SRC_DIR, 'infra')];

/** `features/<name>/<tier>/…` — how far `<tier>` sits past the `features` segment. */
const FEATURE_TIER_OFFSET = 2;

/**
 * Existing Surface violations (issue #179). One entry per file; **fix a file → delete its entry**.
 * The rule is set equality in both directions, so a stale entry fails the suite too.
 */
const SURFACE_ALLOWLIST = new Set([
  // Still direct-imports `firebase/firestore`; removing that is issue #179's scope, not #177's.
  'src/ui/features/auth/pages/LoginPage.tsx',
  'src/ui/features/monthly_close/pages/MonthlyClosePage.tsx',
  'src/ui/features/transaction/components/form/userSelectOptions.ts',
]);

const collectSourceFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) return collectSourceFiles(entryPath);
    if (TEST_FILE_PATTERN.test(entry) || !SOURCE_FILE_PATTERN.test(entry)) return [];
    return [entryPath];
  });
};

const toRepoRelative = (filePath: string): string => path.relative(REPO_ROOT, filePath).split(path.sep).join('/');

const isInside = (filePath: string, dir: string): boolean =>
  filePath === dir || filePath.startsWith(`${dir}${path.sep}`);

/** Alias and relative specifiers resolved to an absolute path; package imports return null. */
const resolveSpecifier = (specifier: string, fromFile: string): string | null => {
  if (specifier.startsWith('@/')) return path.resolve(SRC_DIR, specifier.slice(2));
  if (specifier.startsWith('.')) return path.resolve(path.dirname(fromFile), specifier);
  return null;
};

const specifiersOf = (filePath: string): string[] => {
  const source = readFileSync(filePath, 'utf8');
  return [...source.matchAll(SPECIFIER_PATTERN)].map((match) => match[1]);
};

/** `src/ui/features/<name>/<tier>/…` → `<tier>`; null outside a feature. */
const featureTierOf = (filePath: string): string | null => {
  const parts = filePath.split(path.sep);
  const featureIndex = parts.indexOf('features');
  if (featureIndex === -1) return null;
  return parts[featureIndex + FEATURE_TIER_OFFSET] ?? null;
};

const isController = (filePath: string): boolean =>
  isInside(filePath, path.join(UI_DIR, 'hooks')) || featureTierOf(filePath) === 'hooks';

const isNonSurface = (filePath: string): boolean =>
  NON_SURFACE_DIRS.some((dir) => isInside(filePath, dir)) ||
  NON_SURFACE_FEATURE_DIRS.includes(featureTierOf(filePath) ?? '');

/** Resolves a specifier and reports whether it lands inside any of `roots`. */
const resolvesUnderAny = (specifier: string, fromFile: string, roots: string[]): boolean => {
  const resolved = resolveSpecifier(specifier, fromFile);
  return resolved !== null && roots.some((root) => isInside(resolved, root));
};

/** Rule 1: does this file import domain / application / infra, or the Firebase SDK? */
const surfaceViolationsOf = (filePath: string): string[] =>
  specifiersOf(filePath).filter(
    (specifier) =>
      FIREBASE_SPECIFIER_PATTERN.test(specifier) || resolvesUnderAny(specifier, filePath, FORBIDDEN_ROOTS),
  );

/** Rule 2: does this Controller reach a repository, Firestore, or any infra at all? */
const controllerViolationsOf = (filePath: string): string[] =>
  specifiersOf(filePath).filter(
    (specifier) =>
      FIREBASE_SPECIFIER_PATTERN.test(specifier) ||
      resolvesUnderAny(specifier, filePath, [INFRA_ROOT]),
  );

/** Rule 3: does this Display Labels file reach application or infra? */
const displayLabelViolationsOf = (filePath: string): string[] =>
  specifiersOf(filePath).filter((specifier) => resolvesUnderAny(specifier, filePath, BEHAVIOUR_ROOTS));

const report = (label: string, files: Set<string>): string =>
  `\n${label}:\n${[...files].sort().map((file) => `  - ${file}`).join('\n')}\n`;

describe('UI layer boundary contract (issue #178, ADR-0062)', () => {
  const sourceFiles = collectSourceFiles(UI_DIR);

  const surfaceFiles = sourceFiles.filter((file) => !isNonSurface(file));
  const controllerFiles = sourceFiles.filter(isController);
  const displayLabelFiles = sourceFiles.filter((file) => isInside(file, path.join(UI_DIR, 'constants')));

  const surfaceViolations = new Set(
    surfaceFiles.filter((file) => surfaceViolationsOf(file).length > 0).map(toRepoRelative),
  );

  /** Top-level `src/*.ts(x)` files — the only layer-external place a straddle could hide. */
  const topLevelSourceFiles = readdirSync(SRC_DIR)
    .filter((entry) => SOURCE_FILE_PATTERN.test(entry) && !TEST_FILE_PATTERN.test(entry))
    .map((entry) => path.join(SRC_DIR, entry));

  const layerRootsTouchedBy = (file: string): string[] =>
    LAYER_ROOTS.filter((root) =>
      specifiersOf(file).some((specifier) => {
        const resolved = resolveSpecifier(specifier, file);
        return resolved !== null && isInside(resolved, root);
      }),
    );

  const straddlingFiles = new Set(
    topLevelSourceFiles.filter((file) => layerRootsTouchedBy(file).length > 1).map(toRepoRelative),
  );

  it('discovers UI source files', () => {
    expect(sourceFiles.length).toBeGreaterThan(200);
    expect(surfaceFiles.length).toBeGreaterThan(100);
  });

  it('resolves both alias and relative specifiers to the same root', () => {
    // Tracer for the resolver: a relative hop and its alias must land on one path.
    const file = path.join(UI_DIR, 'features', 'app', 'layout', 'Layout.tsx');
    expect(resolveSpecifier('@/domains/x', file)).toBe(path.join(SRC_DIR, 'domains', 'x'));
    expect(resolveSpecifier('../../../../domains/x', file)).toBe(path.join(SRC_DIR, 'domains', 'x'));
    expect(resolveSpecifier('react', file)).toBeNull();
  });

  it('introduces no new Surface → domain / application / infra imports', () => {
    const unexpected = new Set([...surfaceViolations].filter((file) => !SURFACE_ALLOWLIST.has(file)));
    expect(unexpected, report('New Surface violations', unexpected)).toEqual(new Set());
  });

  it('keeps no stale allowlist entry (fix a file → delete its entry)', () => {
    const stale = new Set([...SURFACE_ALLOWLIST].filter((file) => !surfaceViolations.has(file)));
    expect(stale, report('Stale allowlist entries (file is clean — remove its entry)', stale)).toEqual(
      new Set(),
    );
  });

  it('keeps Controllers off repositories, Firestore and infra (no exception)', () => {
    const violations = new Set(
      controllerFiles
        .filter((file) => controllerViolationsOf(file).length > 0)
        .map((file) => `${toRepoRelative(file)} ${JSON.stringify(controllerViolationsOf(file))}`),
    );
    expect(controllerFiles.length).toBeGreaterThan(50);
    expect(violations, report('Controller violations', violations)).toEqual(new Set());
  });

  it('keeps every non-Surface UI tier off @/infra entirely', () => {
    // The auth gateway is injected at the composition root, so no UI tier needs `@/infra`.
    // Surface is handled separately above (its remaining infra import is an allowlisted #179 case).
    const nonSurfaceFiles = sourceFiles.filter(isNonSurface);
    const offenders = new Set(
      nonSurfaceFiles
        .filter((file) =>
          specifiersOf(file).some(
            (specifier) =>
              FIREBASE_SPECIFIER_PATTERN.test(specifier) ||
              resolvesUnderAny(specifier, file, [INFRA_ROOT]),
          ),
        )
        .map(toRepoRelative),
    );
    expect(nonSurfaceFiles.length).toBeGreaterThan(60);
    expect(offenders, report('Non-Surface files importing infra', offenders)).toEqual(new Set());
  });

  it('confines cross-layer wiring to the composition root', () => {
    const unexpected = new Set(
      [...straddlingFiles].filter((file) => !COMPOSITION_ROOT_ALLOWLIST.has(file)),
    );
    expect(
      unexpected,
      report('Files straddling layers outside the composition root', unexpected),
    ).toEqual(new Set());
  });

  it('keeps no stale composition-root entry', () => {
    const stale = new Set(
      [...COMPOSITION_ROOT_ALLOWLIST].filter((file) => !straddlingFiles.has(file)),
    );
    expect(stale, report('Stale composition-root entries', stale)).toEqual(new Set());
  });

  it('keeps Display Labels off application and infra', () => {
    const violations = new Set(
      displayLabelFiles
        .filter((file) => displayLabelViolationsOf(file).length > 0)
        .map((file) => `${toRepoRelative(file)} ${JSON.stringify(displayLabelViolationsOf(file))}`),
    );
    expect(displayLabelFiles.length).toBeGreaterThan(5);
    expect(violations, report('Display Labels violations', violations)).toEqual(new Set());
  });
});
