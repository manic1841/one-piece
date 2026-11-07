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
});
