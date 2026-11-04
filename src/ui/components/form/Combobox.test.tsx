import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ComboboxField, type ComboboxOption } from './Combobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'salary', label: 'Salary', group: 'Unused' },
  { value: 'rent', label: 'Rent', hint: 'used by 2', group: 'In use' },
  { value: 'food', label: 'Food', group: 'Unused' },
];

describe('ComboboxField', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  });

  it('shows the selected label and emits a bare value on pick', async () => {
    const onChange = vi.fn();
    render(<ComboboxField value="" onChange={onChange} options={OPTIONS} noneLabel="None" />);

    expect(screen.getByTestId('combobox-value')).toHaveTextContent('None');

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: /Salary/ }));

    expect(onChange).toHaveBeenCalledWith('salary');
  });

  it('emits the empty string for the none row', async () => {
    const onChange = vi.fn();
    render(<ComboboxField value="salary" onChange={onChange} options={OPTIONS} noneLabel="None" />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'None' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('prints hints, groups and filters as the query narrows', async () => {
    render(<ComboboxField value="" onChange={vi.fn()} options={OPTIONS} searchPlaceholder="Go" />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(await screen.findByText('used by 2')).toBeInTheDocument();
    expect(screen.getByText('Unused')).toBeInTheDocument();
    expect(screen.getByText('In use')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Go'), { target: { value: 'food' } });

    await waitFor(() => expect(screen.queryByText('Rent')).not.toBeInTheDocument());
    expect(screen.getByText('Food')).toBeInTheDocument();
  });
});
