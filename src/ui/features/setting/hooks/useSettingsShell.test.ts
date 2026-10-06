import { describe, expect, it } from 'vitest';

import {
  firstVisibleSettingsSection,
  visibleSettingsSections,
} from '@/ui/features/setting/hooks/useSettingsShell';

const owner = { isAdmin: false, isHouseholdOwnerOrAdmin: true };
const adminOnly = { isAdmin: true, isHouseholdOwnerOrAdmin: false };
const both = { isAdmin: true, isHouseholdOwnerOrAdmin: true };
const neither = { isAdmin: false, isHouseholdOwnerOrAdmin: false };

describe('settings section visibility', () => {
  it('shows household, accounting and backup to a household owner/admin', () => {
    expect(visibleSettingsSections(owner)).toEqual(['household', 'accounting', 'backup']);
  });

  it('shows only system to a global admin who is not in the household', () => {
    expect(visibleSettingsSections(adminOnly)).toEqual(['system']);
  });

  it('shows all four sections to a global admin who is also household owner/admin', () => {
    expect(visibleSettingsSections(both)).toEqual(['household', 'accounting', 'backup', 'system']);
  });

  it('shows nothing to a plain household member', () => {
    expect(visibleSettingsSections(neither)).toEqual([]);
  });

  it('lands on the first authorized section in tab order', () => {
    expect(firstVisibleSettingsSection(owner)).toBe('household');
    expect(firstVisibleSettingsSection(adminOnly)).toBe('system');
    expect(firstVisibleSettingsSection(both)).toBe('household');
  });

  it('falls back to household when no section is visible, deferring to the shell gate', () => {
    expect(firstVisibleSettingsSection(neither)).toBe('household');
  });
});
