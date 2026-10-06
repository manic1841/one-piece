import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sheet, SheetContent } from '@/ui/components/ui/sheet';

import { DrawerPanel } from './DrawerPanel';

const TITLE = 'TRANSACTION';
const DESCRIPTION = 'Inspect and edit without leaving context.';

const renderInline = () =>
  render(<DrawerPanel inline title={TITLE} description={DESCRIPTION} onClose={() => {}} />);

const renderLive = () =>
  render(
    <Sheet open>
      <SheetContent>
        <DrawerPanel title={TITLE} description={DESCRIPTION} />
      </SheetContent>
    </Sheet>,
  );

describe('DrawerPanel inline/live parity', () => {
  it('renders the title with identical classes in both branches', () => {
    const inline = renderInline();
    const inlineClass = screen.getByText(TITLE).className;
    inline.unmount();

    renderLive();
    expect(screen.getByText(TITLE).className).toBe(inlineClass);
  });

  it('renders the description with identical classes in both branches', () => {
    const inline = renderInline();
    const inlineClass = screen.getByText(DESCRIPTION).className;
    inline.unmount();

    renderLive();
    expect(screen.getByText(DESCRIPTION).className).toBe(inlineClass);
  });

  it('draws the close control with the same classes SheetContent owns', () => {
    const inline = renderInline();
    const inlineClose = screen.getByRole('button', { name: 'Close' }).className;
    inline.unmount();

    renderLive();
    const liveClose = screen.getByRole('button', { name: 'Close' }).className;
    expect(inlineClose).toBe(liveClose);
  });

  it('does not render a DrawerPanel close control in the live branch', () => {
    const inline = renderInline();
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
    inline.unmount();

    renderLive();
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });
});
