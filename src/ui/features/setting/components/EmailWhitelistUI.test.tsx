import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';

import EmailWhitelistUI from './EmailWhitelistUI';

const baseProps = () => ({
  whitelist: ['owner@example.com'],
  loading: false,
  saving: false,
  error: '',
  onAdd: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn().mockResolvedValue(undefined),
});

const renderSettings = (overrides: Partial<ReturnType<typeof baseProps>> = {}) => {
  const props = { ...baseProps(), ...overrides };
  render(
    <ConfirmDialogProvider>
      <EmailWhitelistUI {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
};

describe('EmailWhitelistUI', () => {
  it('lists whitelisted emails and shows the shared empty state when there are none', () => {
    const { unmount } = render(
      <ConfirmDialogProvider>
        <EmailWhitelistUI {...baseProps()} />
      </ConfirmDialogProvider>,
    );
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Whitelisted Emails (1)')).toBeInTheDocument();
    unmount();

    renderSettings({ whitelist: [] });
    expect(screen.getByText('NO WHITELISTED USERS')).toBeInTheDocument();
  });

  it('rejects an invalid email before calling the hook', () => {
    const props = renderSettings();

    fireEvent.change(screen.getByLabelText('Add Email to Whitelist'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(props.onAdd).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email already in the whitelist', () => {
    const props = renderSettings();

    fireEvent.change(screen.getByLabelText('Add Email to Whitelist'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));

    expect(screen.getByText('This email is already in the whitelist')).toBeInTheDocument();
    expect(props.onAdd).not.toHaveBeenCalled();
  });

  it('normalises and adds a valid email', () => {
    const props = renderSettings();

    fireEvent.change(screen.getByLabelText('Add Email to Whitelist'), {
      target: { value: '  New@Example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));

    expect(props.onAdd).toHaveBeenCalledWith('new@example.com');
  });

  it('confirms removal through the shared dialog instead of window.confirm', async () => {
    const props = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Remove owner@example.com' }));
    expect(await screen.findByText('Remove this email?')).toBeInTheDocument();
    expect(props.onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }));

    await waitFor(() => expect(props.onRemove).toHaveBeenCalledWith('owner@example.com'));
  });
});
