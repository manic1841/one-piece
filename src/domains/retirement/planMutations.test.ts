import { describe, expect, it } from 'vitest';

import { appendById, removeById, upsertById } from './planMutations';

interface Item {
  id: string;
  name: string;
  amount: number;
}

const item = (id: string, name: string, amount: number): Item => ({ id, name, amount });

describe('appendById', () => {
  it('appends a new item without mutating the source array', () => {
    const source = [item('a', 'first', 1)];
    const next = item('b', 'second', 2);

    const result = appendById(source, next);

    expect(result).toEqual([item('a', 'first', 1), item('b', 'second', 2)]);
    expect(source).toHaveLength(1);
  });
});

describe('upsertById', () => {
  it('replaces the matching item while preserving its id', () => {
    const source = [item('a', 'first', 1), item('b', 'second', 2)];

    const result = upsertById(source, 'b', { name: 'renamed', amount: 20 });

    expect(result).toEqual([item('a', 'first', 1), { id: 'b', name: 'renamed', amount: 20 }]);
    expect(result[1].id).toBe('b');
  });

  it('keeps fields the update does not mention (merge semantics)', () => {
    const source = [{ id: 'a', name: 'keep', amount: 5, note: 'stable' } as Item & { note: string }];

    const result = upsertById(source, 'a', { name: 'changed', amount: 5 } as Omit<Item, 'id'>);

    expect(result[0]).toEqual({ id: 'a', name: 'changed', amount: 5, note: 'stable' });
  });

  it('returns an equivalent array when no item matches', () => {
    const source = [item('a', 'first', 1)];

    const result = upsertById(source, 'missing', { name: 'x', amount: 0 });

    expect(result).toEqual(source);
  });

  it('handles an empty array', () => {
    expect(upsertById([], 'a', { name: 'x', amount: 0 })).toEqual([]);
  });
});

describe('removeById', () => {
  it('removes only the matching item', () => {
    const source = [item('a', 'first', 1), item('b', 'second', 2)];

    const result = removeById(source, 'a');

    expect(result).toEqual([item('b', 'second', 2)]);
  });

  it('returns an equivalent array when no item matches', () => {
    const source = [item('a', 'first', 1)];

    expect(removeById(source, 'missing')).toEqual(source);
  });
});
