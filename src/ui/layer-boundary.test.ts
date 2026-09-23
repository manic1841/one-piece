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
 *  2. Controller (`hooks`) must not import repositories / Firestore / infra — the only infra
 *     import a Controller may make is the Firebase-free `useAuth` context reader.
 *  3. Display Labels (`constants`) may read domain values and types, but must not reach
 *     `@/application` or `@/infra` (its import scope equals ViewModel's, minus behaviour).
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
  path.join(UI_DIR, 'constants'), // Display Labels
  path.join(UI_DIR, 'utils'), // Presentation Helper
  path.join(UI_DIR, 'assets'),
];

/** Tiers nested inside a feature, e.g. `features/<name>/hooks`. */
const NON_SURFACE_FEATURE_DIRS = ['hooks', 'viewmodels', 'mappers', 'types', 'utils'];

/**
 * The only infra import any UI file may make (ADR-0062 §2 rule 6). Controllers use it; Surface
 * never can, so the Surface rule needs no exception for it.
 */
const CONTROLLER_INFRA_ALLOWED_PATH = path.join(SRC_DIR, 'infra', 'contexts', 'useAuth');

/** The Firebase SDK is infrastructure too, so no UI tier may reach it directly. */
const FIREBASE_SPECIFIER_PATTERN = /^firebase(\/|$)/;

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
 * `features/app/**` is Surface by the fail-closed rule, but its 3 violating files are fixed by
 * issue #184, not here. Until then the whole directory is a **coverage-pending exception**.
 * DELETE THIS when #184 lands: the exception is guarded against rotting (see the test below).
 */
const COVERAGE_PENDING_DIR = path.join(UI_DIR, 'features', 'app');

/**
 * Existing Surface violations (issue #179). One entry per file; **fix a file → delete its entry**.
 * The rule is set equality in both directions, so a stale entry fails the suite too.
 */
const SURFACE_ALLOWLIST = new Set([
  'src/ui/features/account/components/detail/AccountHistoryDialog.tsx',
  'src/ui/features/account/components/detail/AccountSnapshotTable.tsx',
  'src/ui/features/account/components/form/AccountHolding.tsx',
  'src/ui/features/account/pages/AccountDetailPage.tsx',
  'src/ui/features/account/pages/AccountForm.tsx',
  'src/ui/features/account/pages/AccountList.tsx',
  'src/ui/features/account/pages/AccountSnapshotEditor.tsx',
  'src/ui/features/auth/pages/AccessDeniedPage.tsx',
  'src/ui/features/auth/pages/LoginPage.tsx',
  'src/ui/features/dashboard/components/AssetsLiabilitiesBlock.tsx',
  'src/ui/features/dashboard/components/CashFlowChartBlock.tsx',
  'src/ui/features/dashboard/components/MonthlyCloseCard.tsx',
  'src/ui/features/dashboard/pages/DashboardPage.tsx',
  'src/ui/features/debt/components/DebtAccountForm.tsx',
  'src/ui/features/debt/components/DebtPaymentHistory.tsx',
  'src/ui/features/debt/components/detail/DebtSnapshotTable.tsx',
  'src/ui/features/debt/pages/DebtDetailPage.tsx',
  'src/ui/features/debt/pages/DebtListPage.tsx',
  'src/ui/features/ledger/components/LedgerCodeSettings.tsx',
  'src/ui/features/monthly_close/components/CloseAccountBalanceInputs.tsx',
  'src/ui/features/monthly_close/components/CloseStageInputs.tsx',
  'src/ui/features/monthly_close/components/SecuritiesAccountRow.tsx',
  'src/ui/features/monthly_close/pages/MonthlyClosePage.tsx',
  'src/ui/features/portfolio/components/PortfolioDetail.tsx',
  'src/ui/features/portfolio/components/PortfolioForm.tsx',
  'src/ui/features/portfolio/components/PortfolioList.tsx',
  'src/ui/features/portfolio/components/PortfolioSnapshotForm.tsx',
  'src/ui/features/portfolio/components/detail/PortfolioHistoryTable.tsx',
  'src/ui/features/portfolio/components/detail/PortfolioPerformanceCards.tsx',
  'src/ui/features/portfolio/components/snapshot/AccountSnapshotList.tsx',
  'src/ui/features/portfolio/components/snapshot/PerformancePreview.tsx',
  'src/ui/features/portfolio/pages/PortfolioDetailPage.tsx',
  'src/ui/features/portfolio/pages/PortfoliosPage.tsx',
  'src/ui/features/project/components/ProjectForm.tsx',
  'src/ui/features/project/pages/ProjectDetailPage.tsx',
  'src/ui/features/project/pages/ProjectsPage.tsx',
  'src/ui/features/report/pages/ReportsPage.tsx',
  'src/ui/features/retirement/components/AssumptionsForm.tsx',
  'src/ui/features/retirement/components/EventDialog.tsx',
  'src/ui/features/retirement/components/ExpenseDialog.tsx',
  'src/ui/features/retirement/components/IncomeDialog.tsx',
  'src/ui/features/retirement/components/detail/CurrentFinancialState.tsx',
  'src/ui/features/retirement/components/detail/EventTabContent.tsx',
  'src/ui/features/retirement/components/detail/ExpenseTabContent.tsx',
  'src/ui/features/retirement/components/detail/IncomeTabContent.tsx',
  'src/ui/features/retirement/pages/RetirementPlanForm.tsx',
  'src/ui/features/retirement/pages/RetirementPlanList.tsx',
  'src/ui/features/setting/components/MemberManagementUI.tsx',
  'src/ui/features/setting/components/SettingsUI.tsx',
  'src/ui/features/setting/components/WatchListSettings.tsx',
  'src/ui/features/transaction/components/form/DynamicCategorySelector.tsx',
  'src/ui/features/transaction/components/form/TransactionForm.tsx',
  'src/ui/features/transaction/components/form/userSelectOptions.ts',
  'src/ui/features/transaction/pages/TransactionsPage.tsx',
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

/** Rule 2: does this Controller reach a repository, Firestore, or infra other than `useAuth`? */
const controllerViolationsOf = (filePath: string): string[] =>
  specifiersOf(filePath).filter((specifier) => {
    if (FIREBASE_SPECIFIER_PATTERN.test(specifier)) return true;
    const resolved = resolveSpecifier(specifier, filePath);
    if (resolved === null || resolved === CONTROLLER_INFRA_ALLOWED_PATH) return false;
    return isInside(resolved, path.join(SRC_DIR, 'infra'));
  });

/** Rule 3: does this Display Labels file reach application or infra? */
const displayLabelViolationsOf = (filePath: string): string[] =>
  specifiersOf(filePath).filter((specifier) => resolvesUnderAny(specifier, filePath, BEHAVIOUR_ROOTS));

const report = (label: string, files: Set<string>): string =>
  `\n${label}:\n${[...files].sort().map((file) => `  - ${file}`).join('\n')}\n`;

describe('UI layer boundary contract (issue #178, ADR-0062)', () => {
  const sourceFiles = collectSourceFiles(UI_DIR);

  const surfaceFiles = sourceFiles.filter((file) => !isNonSurface(file) && !isInside(file, COVERAGE_PENDING_DIR));
  const controllerFiles = sourceFiles.filter(isController);
  const displayLabelFiles = sourceFiles.filter((file) => isInside(file, path.join(UI_DIR, 'constants')));
  /**
   * Only Surface-tier files under the coverage-pending directory. Counting non-Surface tiers here
   * would mask rot: issue #184 relocates `useHouseholdGuard.ts` into `features/app/hooks/`, where
   * its `@/application` import is legitimate and would keep this guard green forever.
   */
  const coveragePendingFiles = sourceFiles.filter(
    (file) => isInside(file, COVERAGE_PENDING_DIR) && !isNonSurface(file),
  );

  const surfaceViolations = new Set(
    surfaceFiles.filter((file) => surfaceViolationsOf(file).length > 0).map(toRepoRelative),
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

  it('keeps Controllers off repositories, Firestore and infra (only useAuth is allowed)', () => {
    const violations = new Set(
      controllerFiles
        .filter((file) => controllerViolationsOf(file).length > 0)
        .map((file) => `${toRepoRelative(file)} ${JSON.stringify(controllerViolationsOf(file))}`),
    );
    expect(controllerFiles.length).toBeGreaterThan(50);
    expect(violations, report('Controller violations', violations)).toEqual(new Set());
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

  it('keeps the features/app coverage-pending exception alive (remove it once #184 lands)', () => {
    const pending = coveragePendingFiles.filter((file) => surfaceViolationsOf(file).length > 0);
    expect(
      pending.length,
      'features/app/** is clean — delete COVERAGE_PENDING_DIR and let the scan cover it (issue #184).',
    ).toBeGreaterThan(0);
  });
});
