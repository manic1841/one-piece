import { readdirSync, readFileSync, statSync } from 'node:fs';
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
  'components/ui/switch.tsx',
  'features/app/layout/Layout.tsx',
  'features/app/layout/PixelPet.tsx',
  'features/auth/pages/AccessDeniedPage.tsx',
  'features/dashboard/components/AssetsLiabilitiesBlock.tsx',
  'features/dashboard/components/MonthlyCloseCard.tsx',
  'features/portfolio/components/snapshot/PerformancePreview.tsx',
  'features/project/components/detail/ProjectSnapshotItem.tsx',
  'features/project/components/settlement/SettlementDone.tsx',
  'features/project/components/settlement/SettlementProcessing.tsx',
  'features/project/pages/MonthlySettlement.tsx',
  'features/report/pages/BalanceSheet.tsx',
  'features/report/pages/CashFlowStatement.tsx',
  'features/report/pages/IncomeStatement.tsx',
  'features/setting/components/MemberManagementUI.tsx',
  'features/setting/components/SettingsUI.tsx',
]);

const SHADOW_ALLOWED = new Set([
  // Floating layers only: dialog, dropdown, sheet, toast, popover, select,
  // command palette, switch knob, and the materialized app chrome (L1/L2/L3).
  '../App.tsx',
  'components/ui/command.tsx',
  'components/ui/dialog.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/popover.tsx',
  'components/ui/select.tsx',
  'components/ui/sheet.tsx',
  'components/ui/switch.tsx',
  'features/app/layout/Layout.tsx',
  'features/app/layout/PixelPet.tsx',
  'features/report/components/ReportHeader.tsx',
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

describe('design system radius/shadow contract (issue #125)', () => {
  const sourceFiles = [path.resolve(UI_DIR, '../App.tsx'), ...collectSourceFiles(UI_DIR)].map(
    toRelative,
  );

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
});
