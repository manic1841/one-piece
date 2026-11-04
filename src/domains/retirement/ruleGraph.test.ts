import { describe, expect, it } from 'vitest';

import { resolveRuleGraph } from './ruleGraph';

describe('resolveRuleGraph', () => {
  it('returns a dependency-first order', () => {
    expect(
      resolveRuleGraph([
        { id: 'c', source: { type: 'rule', id: 'b' } },
        { id: 'a' },
        { id: 'b', source: { type: 'rule', id: 'a' } },
      ]),
    ).toEqual({ ok: true, order: ['a', 'b', 'c'] });
  });

  it('keeps input order among independent rules', () => {
    expect(resolveRuleGraph([{ id: 'z' }, { id: 'a' }, { id: 'm' }])).toEqual({
      ok: true,
      order: ['z', 'a', 'm'],
    });
  });

  it('sorts disabled rules too', () => {
    expect(
      resolveRuleGraph([
        { id: 'child', source: { type: 'rule', id: 'parent' } },
        { id: 'parent', disabled: true } as never,
      ]),
    ).toEqual({ ok: true, order: ['parent', 'child'] });
  });

  it('ignores non-rule sources', () => {
    expect(resolveRuleGraph([{ id: 'a', source: { type: 'ledgerCode', id: 'missing' } }])).toEqual({
      ok: true,
      order: ['a'],
    });
  });

  it('reports a dangling reference', () => {
    expect(resolveRuleGraph([{ id: 'a', source: { type: 'rule', id: 'missing' } }])).toEqual({
      ok: false,
      errors: [{ code: 'DANGLING_REFERENCE', ruleId: 'a', targetId: 'missing' }],
    });
  });

  it('reports a self reference as a cycle', () => {
    expect(resolveRuleGraph([{ id: 'a', source: { type: 'rule', id: 'a' } }])).toEqual({
      ok: false,
      errors: [{ code: 'CYCLE', ruleIds: ['a', 'a'] }],
    });
  });

  it('reports the full cycle path', () => {
    const result = resolveRuleGraph([
      { id: 'a', source: { type: 'rule', id: 'b' } },
      { id: 'b', source: { type: 'rule', id: 'c' } },
      { id: 'c', source: { type: 'rule', id: 'a' } },
    ]);
    expect(result).toEqual({
      ok: false,
      errors: [{ code: 'CYCLE', ruleIds: ['a', 'b', 'c', 'a'] }],
    });
  });

  it('reports multiple cycles', () => {
    const result = resolveRuleGraph([
      { id: 'a', source: { type: 'rule', id: 'b' } },
      { id: 'b', source: { type: 'rule', id: 'a' } },
      { id: 'c', source: { type: 'rule', id: 'd' } },
      { id: 'd', source: { type: 'rule', id: 'c' } },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((error) => error.code === 'CYCLE')).toBe(true);
    }
  });

  it('reports dangling references and cycles together', () => {
    const result = resolveRuleGraph([
      { id: 'a', source: { type: 'rule', id: 'b' } },
      { id: 'b', source: { type: 'rule', id: 'a' } },
      { id: 'c', source: { type: 'rule', id: 'missing' } },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.code).sort()).toEqual([
        'CYCLE',
        'DANGLING_REFERENCE',
      ]);
    }
  });

  it('sorts the acyclic part before reporting', () => {
    const result = resolveRuleGraph([
      { id: 'root' },
      { id: 'a', source: { type: 'rule', id: 'b' } },
      { id: 'b', source: { type: 'rule', id: 'a' } },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'CYCLE', ruleIds: ['a', 'b', 'a'] }]);
    }
  });

  it('handles an empty graph', () => {
    expect(resolveRuleGraph([])).toEqual({ ok: true, order: [] });
  });
});
