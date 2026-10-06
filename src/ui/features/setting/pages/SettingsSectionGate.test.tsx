import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SettingsSectionGate } from './SettingsSectionGate';

const renderGate = (
  authorized: boolean,
  access = { isAdmin: false, isHouseholdOwnerOrAdmin: true },
) =>
  render(
    <MemoryRouter initialEntries={['/settings/backup']}>
      <Routes>
        <Route path="/settings/household" element={<div>HOUSEHOLD SECTION</div>} />
        <Route path="/settings/system" element={<div>SYSTEM SECTION</div>} />
        <Route
          path="/settings/backup"
          element={
            <SettingsSectionGate access={access} authorized={authorized}>
              <div>GATED CONTENT</div>
            </SettingsSectionGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('SettingsSectionGate', () => {
  it('renders the section when the viewer is authorized', () => {
    renderGate(true);

    expect(screen.getByText('GATED CONTENT')).toBeInTheDocument();
  });

  it('redirects an unauthorized viewer to their first authorized section', () => {
    renderGate(false, { isAdmin: false, isHouseholdOwnerOrAdmin: true });

    expect(screen.getByText('HOUSEHOLD SECTION')).toBeInTheDocument();
    expect(screen.queryByText('GATED CONTENT')).not.toBeInTheDocument();
  });

  it('redirects a global admin outside the household to the system section', () => {
    renderGate(false, { isAdmin: true, isHouseholdOwnerOrAdmin: false });

    expect(screen.getByText('SYSTEM SECTION')).toBeInTheDocument();
  });
});
