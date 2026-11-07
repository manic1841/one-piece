import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Design-system contract (issue #125): radius/shadow convergence.
 *
 * Sources are asserted at text level because these are token-level rules
 * that apply to every class string in the UI layer, not component behavior.
 */
const UI_DIR = path.resolve(__dirname);

const TEST_FILE_PATTERN = /\.test\.(ts|tsx)$/;
const CLASS_SOURCE_PATTERN = /\.(ts|tsx)$/;

const ROUNDED_FULL_ALLOWED = new Set([
  // Essential circles: switch track/knob, spinners, avatars, status dots,
  // data-viz capsules (progress tracks), circular state/icon containers.
  'components/Avatar.tsx',
  'components/AccessDenied.tsx',
  // Orbit pending ring (motion-system §5.4).
  'components/OrbitLoader.tsx',
  'components/RadioGroup.tsx',
  'components/charts/DonutChart.tsx',
  'components/charts/InteractiveLineChart.tsx',
  'components/ui/switch.tsx',
  // Bottom-sheet drag handle (design-system §7 `sheet`).
  'components/ui/sheet.tsx',
  'features/app/layout/PixelPet.tsx',
  'features/dashboard/components/AssetCompositionBlock.tsx',
  // Retiring event axis: single-year nodes are dots, span bars are capsules.
  'features/retirement/components/LifeEventTimeline.tsx',
  // Status dot in the event-details summary (income / expense tone).
  'features/retirement/components/LifeEventInspector.tsx',
  // Slider thumb, an essential circle like the switch knob.
  'features/retirement/components/PercentSlider.tsx',
]);

const SHADOW_ALLOWED = new Set([
  // Floating layers only: dialog, dropdown, sheet, toast, popover, select,
  // command palette, switch knob, and the materialized app chrome (L1/L2/L3).
  'components/Toast.tsx',
  'components/charts/ChartTooltip.tsx',
  'components/ui/command.tsx',
  'components/ui/dialog.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/popover.tsx',
  'components/ui/select.tsx',
  'components/ui/sheet.tsx',
  'components/ui/switch.tsx',
  'components/ui/tooltip.tsx',
  'features/app/layout/Layout.tsx',
  'features/app/layout/PixelPet.tsx',
  'features/app/pages/GalleryInteraction.tsx',
]);

/**
 * Sub-11px type that predates the floor or sits in role classes the floor rule
 * does not name (avatar initials, crumb, legend, progress meta). Everything else
 * — table headers, mobile field labels, chart axis / reference labels — must stay
 * at 11px or above.
 */
const TYPE_FLOOR_ALLOWED = new Set([
  'components/Avatar.tsx',
  'components/CliProgress.tsx',
  'components/PageHeader.tsx',
  'components/Toast.tsx',
  'components/YearMonthPicker.tsx',
  'components/charts/ChartLegend.tsx',
  'features/account/pages/AccountList.tsx',
  'features/app/pages/GalleryInteraction.tsx',
  'features/monthly_close/stages/debt_repayment/components/CloseDebtRepaymentStage.tsx',
  'features/transaction/components/TransactionItem.tsx',
  'features/transaction/components/TransactionPeriodPicker.tsx',
]);

const collectSourceFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) return collectSourceFiles(entryPath);
    if (TEST_FILE_PATTERN.test(entry) || !CLASS_SOURCE_PATTERN.test(entry)) return [];
    return [entryPath];
  });
};

const toRelative = (filePath: string): string => path.relative(UI_DIR, filePath);

const read = (file: string): string => readFileSync(path.resolve(UI_DIR, file), 'utf8');

/** Feature files whose `text-destructive` is not error copy (counts, required marker). */
const DESTRUCTIVE_TONE_ONLY = new Set([
  'features/retirement/components/LifeEventInspector.tsx',
  'features/retirement/components/ProjectionRuleRow.tsx',
  'features/retirement/components/ProjectionRulesSection.tsx',
]);

/**
 * The retirement flow is the reference implementation for labels, section
 * headings and error text (design-system §4 / §7 `form`); keep it that way.
 */
const RETIREMENT_DIR = 'features/retirement';

describe('design system radius/shadow contract (issue #125)', () => {
  const sourceFiles = [path.resolve(UI_DIR, '../App.tsx'), ...collectSourceFiles(UI_DIR)].map(
    toRelative,
  );
  const retirementFiles = collectSourceFiles(path.resolve(UI_DIR, RETIREMENT_DIR)).map(toRelative);

  it('discovers UI source files', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it('has no rounded-xl anywhere in the UI layer', () => {
    const violations = sourceFiles.filter((file) =>
      readFileSync(path.resolve(UI_DIR, file), 'utf8').includes('rounded-xl'),
    );
    expect(violations).toEqual([]);
  });

  it('keeps rounded-full only on essential circle elements', () => {
    const violations = sourceFiles
      .filter((file) => !ROUNDED_FULL_ALLOWED.has(file))
      .filter((file) => readFileSync(path.resolve(UI_DIR, file), 'utf8').includes('rounded-full'));
    expect(violations).toEqual([]);
  });

  it('keeps shadows only on floating layers', () => {
    const violations = sourceFiles
      .filter((file) => !SHADOW_ALLOWED.has(file))
      .filter((file) =>
        readFileSync(path.resolve(UI_DIR, file), 'utf8').match(/shadow-(sm|md|lg|xl|2xl|inner)/),
      );
    expect(violations).toEqual([]);
  });

  it('never goes below the 11px type floor (design-system §4)', () => {
    const violations = sourceFiles
      .filter((file) => !TYPE_FLOOR_ALLOWED.has(file))
      .filter((file) =>
        readFileSync(path.resolve(UI_DIR, file), 'utf8').match(/text-\[([0-9]|10)px\]/),
      );
    expect(violations).toEqual([]);
  });

  it('sets field-label size from the label token, not a page-level override', () => {
    const violations = sourceFiles.filter((file) =>
      readFileSync(path.resolve(UI_DIR, file), 'utf8').match(/\[&[^\]]*_label\]/),
    );
    expect(violations).toEqual([]);
  });

  it('uses the shared eyebrow / section-title class instead of copying them', () => {
    const eyebrowRecipe = /text-\[11px\][^'"`]*(uppercase|tracking-widest)/;
    const violations = retirementFiles.filter((file) => eyebrowRecipe.test(read(file)));
    expect(violations).toEqual([]);
  });

  it('renders error copy through formMessageClass', () => {
    const violations = retirementFiles
      .filter((file) => !DESTRUCTIVE_TONE_ONLY.has(file))
      .filter((file) => {
        const source = read(file);
        return source
          .split('\n')
          .filter((line) => line.includes('text-destructive'))
          .some((line) => !line.includes('font-medium') && !line.includes('formMessageClass'));
      });
    expect(violations).toEqual([]);
  });
});

/**
 * Motion contract (motion-system §2): a bare `duration-<number>` picks its own
 * length and drifts from the token scale. The gallery is exempt — it *shows*
 * motion, so it may hardcode what it demonstrates.
 */
const MOTION_ALLOWED = new Set<string>([]);

describe('motion duration contract (motion-system §2)', () => {
  const sourceFiles = collectSourceFiles(UI_DIR)
    .map(toRelative)
    .filter((file) => !file.startsWith('features/app/pages/'));

  it('uses duration tokens, never bare numeric durations', () => {
    const violations = sourceFiles
      .filter((file) => !MOTION_ALLOWED.has(file))
      .filter((file) => read(file).match(/\bduration-(?![a-z[])\d/));
    expect(violations).toEqual([]);
  });

  it('keeps the close control in one place', () => {
    const closeSurfaces = [
      'components/ui/sheet.tsx',
      'components/ui/dialog.tsx',
      'components/drawer/DrawerPanel.tsx',
    ];
    const copies = closeSurfaces.filter((file) =>
      read(file).includes('absolute right-4 top-4 rounded-sm opacity-70'),
    );
    expect(copies).toEqual([]);
    // Every close surface still goes through the shared class.
    const missing = closeSurfaces.filter((file) => !read(file).includes('CLOSE_BUTTON_CLASS'));
    expect(missing).toEqual([]);
  });

  /**
   * M05 is asymmetric on purpose (motion-system §5.1): the exit has to be written
   * out, so a half-removed pair silently falls back to a hard cut on one side.
   */
  it('pairs an expand and a collapse animation on every disclosure', () => {
    const surfaces: Array<[file: string, prefix: string]> = [
      ['components/ui/accordion.tsx', 'accordion'],
      ['components/form/AdvancedDisclosure.tsx', 'disclosure'],
      ['components/data-table/DataTableDetailRow.tsx', 'disclosure'],
      ['components/statement/StatementTable.tsx', 'disclosure'],
    ];
    const missing = surfaces
      .filter(([file, prefix]) => {
        const source = read(file);
        return (
          !source.includes(`${prefix}-down`) ||
          !source.includes(`${prefix}-up`) ||
          !source.includes('data-[state=open]') ||
          !source.includes('data-[state=closed]')
        );
      })
      .map(([file]) => file);
    expect(missing).toEqual([]);
  });

  /**
   * The pair must also be wired the right way round (motion-system §2): a
   * front-loaded expand animation cancels the length gap, which is what made
   * expanding read as shorter than collapsing.
   */
  it('gives every disclosure the directional curve for its half of M05', () => {
    const source = readFileSync(path.resolve(UI_DIR, '..', '..', 'tailwind.config.js'), 'utf8');
    const pairs = ['accordion', 'disclosure'];
    const wrong = pairs.filter((prefix) => {
      return (
        !source.includes(`'${prefix}-down': \`${prefix}-down \${ms(DURATION.expand)} \${bezier(EASE.expand)}\``) ||
        !source.includes(`'${prefix}-up': \`${prefix}-up \${ms(DURATION.collapse)} \${bezier(EASE.collapse)}\``)
      );
    });
    expect(wrong).toEqual([]);
  });
});

/**
 * M07 (motion-system §5.2) only runs between two confirmed values on a node that
 * stays mounted. Both halves are invisible in review when they break: a missing
 * formatter freezes the raw digits, and a skeleton keyed on `loading` remounts the
 * figure at its new value, so it never counts.
 */
describe('number interpolation contract (motion-system §5.2)', () => {
  const INTERPOLATING = [
    'features/dashboard/pages/DashboardPage.tsx',
    'features/account/components/AccountDetail.tsx',
    'features/account/pages/AccountList.tsx',
    'features/debt/components/DebtDetail.tsx',
    'features/debt/pages/DebtListPage.tsx',
    'features/portfolio/components/PortfolioDetail.tsx',
    'features/portfolio/components/PortfolioList.tsx',
    'features/project/components/ProjectDetail.tsx',
    'features/report/pages/ReportListPage.tsx',
    'features/retirement/components/AnnualYearPanel.tsx',
    'features/retirement/components/ProjectionOverviewTab.tsx',
    'features/retirement/components/SummaryMetrics.tsx',
    'features/retirement/components/WorkspacePreview.tsx',
    'features/retirement/components/WorkspaceRail.tsx',
    'components/statement/StatementPanel.tsx',
  ];

  it('pairs every animatedValue with a numeric formatter', () => {
    const incomplete = INTERPOLATING.filter((file) => {
      const source = read(file);
      return source.includes('animatedValue=') && !source.includes('animateFormat=');
    });
    expect(incomplete).toEqual([]);
  });

  /** A settled figure must survive a reload; only the first paint may blank it. */
  it('does not gate a detail page on bare `loading`', () => {
    const pages = [
      'features/account/pages/AccountDetailPage.tsx',
      'features/debt/pages/DebtDetailPage.tsx',
      'features/project/pages/ProjectDetailPage.tsx',
      'features/portfolio/pages/PortfolioDetailPage.tsx',
      'features/portfolio/components/PortfolioList.tsx',
    ];
    const bare = pages.filter((file) => read(file).includes('if (loading) {'));
    expect(bare).toEqual([]);
  });

  it('keeps the dashboard hero mounted across a reload', () => {
    const source = read('features/dashboard/pages/DashboardPage.tsx');
    expect(source).toContain('const firstLoad = loading && overview === null;');
  });

  /**
   * Every applied figure counts up from zero on load (motion-system §5.2), so
   * the two props travel together: a value that interpolates but never counts
   * reads as dead on a screen whose whole subject is that number.
   */
  it('opts every interpolating figure into a mount count-up', () => {
    const missing = INTERPOLATING.filter(
      (file) => read(file).includes('animatedValue=') && !read(file).includes('animateOnMount'),
    );
    expect(missing).toEqual([]);
  });

  it('opens the mount count-up on all six dashboard figures', () => {
    const source = read('features/dashboard/pages/DashboardPage.tsx');
    // One on the hero, one on the stat row: the five tiles share the second.
    expect(source.match(/animateOnMount/g)).toHaveLength(2);
  });

  /** The report summary's three figures and the account total are set individually. */
  it('opens the mount count-up on every report summary figure and the account total', () => {
    expect(read('features/report/pages/ReportListPage.tsx').match(/animateOnMount/g)).toHaveLength(3);
    expect(read('features/account/pages/AccountList.tsx')).toContain('animateOnMount');
  });
});

describe('chart reveal contract (motion-system §5.7)', () => {
  const tailwind = readFileSync(path.resolve(UI_DIR, '../../tailwind.config.js'), 'utf8');
  const chart = read('components/charts/LineChart.tsx');

  it('defines the keyframe and its animation binding', () => {
    expect(tailwind).toContain("'chart-reveal': {");
    expect(tailwind).toContain('${ms(DURATION.slow)} ${bezier(EASE.expand)}');
  });

  /** The reveal is a baseline clip, not a dash draw: `preserveAspectRatio="none"`
   * would stretch a dash and scaling the group would thicken the stroke. */
  it('grows the series out of the baseline with a clip', () => {
    expect(chart).toContain('animate-chart-reveal');
    expect(chart).toContain('[transform-origin:bottom]');
    expect(chart).toContain('clipPath');
  });

  it('leaves a lone point already settled', () => {
    expect(chart).toContain('geometry.points.length > 1');
  });
});
