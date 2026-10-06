import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Radio, RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('renders a radiogroup with the accessible name', () => {
    render(
      <RadioGroup aria-label="Cadence" name="cadence" value="monthly">
        <Radio value="monthly" label="Monthly" />
        <Radio value="quarterly" label="Quarterly" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup', { name: 'Cadence' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Quarterly' })).not.toBeChecked();
  });

  it('emits the selected value on change', () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Cadence" name="cadence" value="monthly" onValueChange={onValueChange}>
        <Radio value="monthly" label="Monthly" />
        <Radio value="yearly" label="Yearly" />
      </RadioGroup>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Yearly' }));

    expect(onValueChange).toHaveBeenCalledWith('yearly');
  });
});
