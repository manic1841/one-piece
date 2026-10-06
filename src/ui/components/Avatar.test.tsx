import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders uppercase initials by default', () => {
    render(<Avatar initials="CY" />);

    expect(screen.getByText('CY')).toBeInTheDocument();
  });

  it('renders the image when src is provided', () => {
    render(<Avatar src="avatar.png" alt="Celine" />);

    expect(screen.getByRole('img', { name: 'Celine' })).toBeInTheDocument();
  });

  it('uses the small size class', () => {
    const { container } = render(<Avatar initials="OP" size="sm" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('h-6 w-6');
  });
});
