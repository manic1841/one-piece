import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageSection } from './PageSection';

describe('PageSection', () => {
  it('renders no glyph when the band carries no state', () => {
    const { container } = render(
      <PageSection number="01" title="BASELINE">
        body
      </PageSection>,
    );

    expect(container.firstElementChild).not.toHaveTextContent('error');
  });

  it('hangs the hint under the heading instead of the content', () => {
    render(
      <PageSection number="03" title="RULES" hint="Add at least one income rule.">
        body
      </PageSection>,
    );

    const heading = screen.getByText('03 / RULES');
    expect(heading.parentElement?.parentElement).toHaveTextContent('Add at least one income rule.');
  });

  it('names the state for assistive tech when a glyph is shown', () => {
    render(
      <PageSection number="02" title="ASSUMPTIONS" status="error">
        body
      </PageSection>,
    );

    expect(screen.getByText('02 / ASSUMPTIONS').parentElement).toHaveTextContent('ERROR');
  });

  it('keeps a content-only band free of heading chrome', () => {
    const { container } = render(<PageSection hint="ignored without a heading">body</PageSection>);

    expect(container.firstElementChild).not.toHaveTextContent('ignored without a heading');
  });

  it('renders the title as an h2, never a second h1', () => {
    render(<PageSection title="BASELINE">body</PageSection>);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('BASELINE');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('rules off a titled band but leaves a content-only band unruled', () => {
    const { container, rerender } = render(<PageSection title="BASELINE">body</PageSection>);

    expect(container.firstElementChild?.className).toContain('border-b');

    rerender(<PageSection>body</PageSection>);
    expect(container.firstElementChild?.className).not.toContain('border-b');
  });
});
