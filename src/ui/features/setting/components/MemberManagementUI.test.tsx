import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';

import MemberManagementUI from './MemberManagementUI';

const household = {
  id: 'h1',
  members: {
    u1: { role: 'owner' },
    u2: { role: 'member' },
  },
} as never;

const baseProps = () => ({
  household,
  memberProfiles: {
    u1: { email: 'owner@example.com', displayName: 'Owner' },
    u2: { email: 'member@example.com', displayName: 'Member' },
  },
  loading: false,
  error: '',
  success: '',
  onAdd: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn().mockResolvedValue(undefined),
  onUpdateRole: vi.fn().mockResolvedValue(undefined),
  currentUid: 'u1',
});

const renderSettings = (overrides: Partial<ReturnType<typeof baseProps>> = {}) => {
  const props = { ...baseProps(), ...overrides };
  render(
    <ConfirmDialogProvider>
      <MemberManagementUI {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
};

describe('MemberManagementUI', () => {
  it('lists members with profile and marks the signed-in member', () => {
    renderSettings();

    expect(screen.getByText('Owner', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Current Members (2)')).toBeInTheDocument();
  });

  it('adds a member with the entered email and role', () => {
    const props = renderSettings();

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Member' }));

    expect(props.onAdd).toHaveBeenCalledWith('new@example.com', 'member');
  });

  it('shows error and success lines when provided', () => {
    renderSettings({ error: '加入失敗', success: '已加入' });

    expect(screen.getByText('加入失敗')).toBeInTheDocument();
    expect(screen.getByText('已加入')).toBeInTheDocument();
  });

  it('asks for confirmation through the shared dialog before removing a member', async () => {
    const props = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Remove member member@example.com' }));
    expect(await screen.findByText('Remove this member?')).toBeInTheDocument();
    expect(props.onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }));

    await waitFor(() => expect(props.onRemove).toHaveBeenCalledWith('u2'));
  });
});
