import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReadoutField } from './ReadoutField';

describe('ReadoutField', () => {
  it('renders the label and the derived value', () => {
    render(<ReadoutField label="Duration" value="Lifelong" />);

    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Lifelong')).toBeInTheDocument();
  });
});
