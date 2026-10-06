import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type SettingsAccessContext,
  useSettingsShell,
} from '@/ui/features/setting/hooks/useSettingsShell';

import SettingsIndexRedirect from './SettingsIndexRedirect';
import SettingsLayout from './SettingsLayout';

vi.mock('@/ui/features/setting/hooks/useSettingsShell', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/ui/features/setting/hooks/useSettingsShell')>();
  return { ...actual, useSettingsShell: vi.fn() };
});

type ShellResult = ReturnType<typeof useSettingsShell>;

const shell = (
  access: SettingsAccessContext,
  overrides: Partial<ShellResult> = {},
): ShellResult => ({
  ...access,
  isSettingsAuthorized: access.isAdmin || access.isHouseholdOwnerOrAdmin,
  loading: false,
  ...overrides,
});

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsIndexRedirect />} />
          <Route path="household" element={<div>HOUSEHOLD SECTION</div>} />
          <Route path="accounting" element={<div>ACCOUNTING SECTION</div>} />
          <Route path="backup" element={<div>BACKUP SECTION</div>} />
          <Route path="system" element={<div>SYSTEM SECTION</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const tabNames = () => screen.getAllByRole('link').map((link) => link.textContent);

describe('SettingsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state before the household role resolves', () => {
    vi.mocked(useSettingsShell).mockReturnValue(
      shell({ isAdmin: false, isHouseholdOwnerOrAdmin: false }, { loading: true }),
    );

    renderAt('/settings');

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('denies a plain member with the settings-specific copy and no tabs', () => {
    vi.mocked(useSettingsShell).mockReturnValue(
      shell({ isAdmin: false, isHouseholdOwnerOrAdmin: false }),
    );

    renderAt('/settings');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Access Denied');
    expect(screen.getByText(/Only administrators or household owners\/admins/)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders three tabs for a household owner/admin and lands on household', () => {
    vi.mocked(useSettingsShell).mockReturnValue(
      shell({ isAdmin: false, isHouseholdOwnerOrAdmin: true }),
    );

    renderAt('/settings');

    expect(tabNames()).toEqual(['Household', 'Accounting', 'Backup']);
    expect(screen.getByText('HOUSEHOLD SECTION')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Household' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders only the system tab for a global admin outside the household and lands on system', () => {
    vi.mocked(useSettingsShell).mockReturnValue(
      shell({ isAdmin: true, isHouseholdOwnerOrAdmin: false }),
    );

    renderAt('/settings');

    expect(tabNames()).toEqual(['System']);
    expect(screen.getByText('SYSTEM SECTION')).toBeInTheDocument();
  });

  it('renders all four tabs for a global admin who is also household owner/admin', () => {
    vi.mocked(useSettingsShell).mockReturnValue(
      shell({ isAdmin: true, isHouseholdOwnerOrAdmin: true }),
    );

    renderAt('/settings/accounting');

    expect(tabNames()).toEqual(['Household', 'Accounting', 'Backup', 'System']);
    expect(screen.getByText('ACCOUNTING SECTION')).toBeInTheDocument();
  });
});
