import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { reorderFromDragEnd } from './useSortableList';
import { GripHandle } from './SortableListScope';

describe('reorderFromDragEnd', () => {
  it('returns the moved array via arrayMove semantics', () => {
    const items = ['a', 'b', 'c'];
    const result = reorderFromDragEnd({ items, activeId: 'a', overId: 'c' });

    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('returns null when the drop target is missing or identical to the source', () => {
    expect(reorderFromDragEnd({ items: ['a', 'b'], activeId: 'a', overId: null })).toBeNull();
    expect(reorderFromDragEnd({ items: ['a', 'b'], activeId: 'a', overId: 'a' })).toBeNull();
  });

  it('returns null when the active or over id is not in the list', () => {
    expect(reorderFromDragEnd({ items: ['a', 'b'], activeId: 'x', overId: 'b' })).toBeNull();
    expect(reorderFromDragEnd({ items: ['a', 'b'], activeId: 'a', overId: 'x' })).toBeNull();
  });
});

describe('GripHandle', () => {
  it('renders an aria-labeled button bound to the passed attributes and listeners', () => {
    const attributes = { role: 'button', tabIndex: 0, 'aria-roledescription': 'sortable' };
    const listeners = { onKeyDown: vi.fn(), onPointerDown: vi.fn() };

    render(
      <GripHandle
        label="Reorder Main Portfolio"
        attributes={attributes as never}
        listeners={listeners as never}
      />,
    );

    const grip = screen.getByRole('button', { name: 'Reorder Main Portfolio' });
    expect(grip.getAttribute('aria-roledescription')).toBe('sortable');
    expect(grip.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(grip, { key: ' ' });
    expect(listeners.onKeyDown).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(grip);
    expect(listeners.onPointerDown).toHaveBeenCalledTimes(1);
  });

  it('stops click propagation so a row-level navigation does not fire', () => {
    const parentClick = vi.fn();
    const { container } = render(
      <div onClick={parentClick}>
        <GripHandle label="Grip" listeners={undefined} />
      </div>,
    );

    fireEvent.click(container.querySelector('button')!);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
