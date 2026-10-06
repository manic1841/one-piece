import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserMenu } from './UserMenu';

const openMenu = () => {
  const trigger = screen.getByRole('button', { name: /avatar/i });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  return trigger;
};

describe('UserMenu', () => {
  it('falls back to the display name initials when no photo is set', () => {
    render(<UserMenu name="Celine Yang" onSettings={() => {}} onLogout={() => {}} />);

    expect(screen.getByText('CY')).toBeInTheDocument();
  });

  it('renders the photo when the profile has one', () => {
    const { container } = render(
      <UserMenu
        name="Celine Yang"
        photoURL="https://example.com/me.png"
        onSettings={() => {}}
        onLogout={() => {}}
      />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://example.com/me.png');
    expect(screen.queryByText('CY')).not.toBeInTheDocument();
  });

  it('calls the identity handlers from the menu items', async () => {
    const onSettings = vi.fn();
    const onLogout = vi.fn();
    render(<UserMenu name="Celine Yang" onSettings={onSettings} onLogout={onLogout} />);

    openMenu();

    const settings = await screen.findByRole('menuitem', { name: 'Settings' });
    fireEvent.pointerDown(settings);
    fireEvent.click(settings);
    expect(onSettings).toHaveBeenCalledTimes(1);

    openMenu();
    const logout = await screen.findByRole('menuitem', { name: 'Logout' });
    fireEvent.pointerDown(logout);
    fireEvent.click(logout);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
