import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityList, ActivityRow } from './ActivityList';

describe('ActivityRow', () => {
  it('renders date, title, meta, and amount with tone', () => {
    render(
      <ActivityList>
        <ActivityRow date="SEP 18" title="Salary Received" meta="Main Bank" amount="+$85,000" tone="positive" />
      </ActivityList>,
    );

    expect(screen.getByText('SEP 18')).toBeInTheDocument();
    expect(screen.getByText('Salary Received')).toBeInTheDocument();
    expect(screen.getByText('Main Bank')).toBeInTheDocument();
    expect(screen.getByText('+$85,000')).toBeInTheDocument();
  });
});
