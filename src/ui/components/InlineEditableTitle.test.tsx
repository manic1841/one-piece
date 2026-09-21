import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InlineEditableTitle } from './InlineEditableTitle';

describe('InlineEditableTitle', () => {
  it('renders the value with an edit affordance in display mode', () => {
    render(<InlineEditableTitle value="Main Portfolio" onSave={vi.fn()} />);

    expect(screen.getByText('Main Portfolio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit name' })).toBeInTheDocument();
  });

  it('saves a trimmed non-empty rename and exits edit mode', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineEditableTitle value="Main Portfolio" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));

    const input = screen.getByLabelText('Rename') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Growth Fund  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Growth Fund');
    });
    await waitFor(() => {
      expect(screen.queryByLabelText('Rename')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Edit name' })).toBeInTheDocument();
  });

  it('cancels on Escape and restores the original value', () => {
    render(<InlineEditableTitle value="Main Portfolio" onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    const input = screen.getByLabelText('Rename');
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('Main Portfolio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rename')).toBeNull();
  });

  it('saves on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineEditableTitle value="Main Portfolio" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    const input = screen.getByLabelText('Rename');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('New Name');
    });
  });

  it('does not save an empty draft and exits edit mode', async () => {
    const onSave = vi.fn();
    render(<InlineEditableTitle value="Main Portfolio" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit name' }));
    const input = screen.getByLabelText('Rename');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByLabelText('Rename')).toBeNull();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hides the edit affordance when disabled', () => {
    render(<InlineEditableTitle value="Main Portfolio" onSave={vi.fn()} disabled />);

    const editButton = screen.getByRole('button', { name: 'Edit name' });
    expect(editButton).toBeDisabled();
  });
});
