import { describe, expect, it } from 'vitest';

import { type StatementRow } from './StatementTable';
import {
  type StatementNode,
  type StatementSectionSource,
  buildStatementRows,
} from './statementRows';

/** `StatementTable` 以 `flattenRows` 攤平樹狀列；測試用同一視角斷言。 */
const flatten = (rows: StatementRow[]): StatementRow[] =>
  rows.flatMap((row) => [row, ...flatten(row.children)]);

const node = (
  code: string,
  label: string,
  amountText: string,
  subItems?: StatementNode[],
): StatementNode => ({ code, label, cell: { amountText }, subItems });

const section = (over: Partial<StatementSectionSource> = {}): StatementSectionSource => ({
  key: 'income',
  label: '收入',
  totalLabel: '收入合計',
  cell: { amountText: 'NT$100' },
  nodes: [],
  ...over,
});

describe('buildStatementRows', () => {
  it('renders section header, its nodes, then the subtotal row, before the terminus', () => {
    const rows = buildStatementRows({
      sections: [section({ nodes: [node('I1', '薪資', 'NT$100')] })],
      terminus: { label: '本期淨利', cell: { amountText: 'NT$100' } },
    });

    expect(flatten(rows).map((row) => [row.label, row.tone, row.amountText])).toEqual([
      ['收入', 'section', null],
      ['薪資', 'group', 'NT$100'],
      ['收入合計', 'subtotal', 'NT$100'],
      ['本期淨利', 'terminus', 'NT$100'],
    ]);
  });

  it('assigns tone and indent level by nesting depth (group → detail → deep detail)', () => {
    const rows = buildStatementRows({
      sections: [
        section({
          nodes: [
            node('g', '群組', 'NT$3', [node('d', '明細', 'NT$2', [node('x', '細項', 'NT$1')])]),
          ],
        }),
      ],
      terminus: { label: '本期淨利', cell: { amountText: null } },
    });

    const byLabel = Object.fromEntries(flatten(rows).map((row) => [row.label, row]));
    expect(byLabel['收入']).toMatchObject({ tone: 'section', level: 0 });
    expect(byLabel['群組']).toMatchObject({ tone: 'group', level: 1 });
    expect(byLabel['明細']).toMatchObject({ tone: 'detail', level: 2 });
    expect(byLabel['細項']).toMatchObject({ tone: 'deepDetail', level: 3 });
  });

  it('scopes keys by section path so same-coded nodes in different sections never collide', () => {
    const rows = buildStatementRows({
      sections: [
        section({ key: 'operating', label: '營業', nodes: [node('inflow', '流入', 'NT$1')] }),
        section({ key: 'investing', label: '投資', nodes: [node('inflow', '流入', 'NT$2')] }),
      ],
      terminus: { label: '現金淨變動', cell: { amountText: null } },
    });

    const keys = flatten(rows).map((row) => row.key);
    expect(keys).toEqual([
      'section:operating',
      'operating:inflow',
      'total:operating',
      'section:investing',
      'investing:inflow',
      'total:investing',
      'terminus',
    ]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('propagates the warning flag and a null amount from the source cell', () => {
    const rows = buildStatementRows({
      sections: [
        section({
          cell: { amountText: 'NT$0 -> NT$5', amountWarning: true },
          nodes: [{ code: 'I1', label: '薪資', cell: { amountText: null } }],
        }),
      ],
      terminus: { label: '本期淨利', cell: { amountText: 'NT$5', amountWarning: true } },
    });

    const flat = flatten(rows);
    expect(flat[0].amountWarning).toBeUndefined();
    expect(flat[1]).toMatchObject({ amountText: null });
    expect(flat[2]).toMatchObject({ amountText: 'NT$0 -> NT$5', amountWarning: true });
    expect(flat[3]).toMatchObject({ amountWarning: true });
  });

  it('gives leaf nodes an empty children array and parents their nested rows', () => {
    const rows = buildStatementRows({
      sections: [section({ nodes: [node('g', '群組', 'NT$1', [node('d', '明細', 'NT$1')])] })],
      terminus: { label: '本期淨利', cell: { amountText: null } },
    });

    const flat = flatten(rows);
    const group = flat.find((row) => row.label === '群組');
    const detail = flat.find((row) => row.label === '明細');
    expect(group?.children.map((child) => child.label)).toEqual(['明細']);
    expect(detail?.children).toEqual([]);
  });

  it('returns only the terminus row when there are no sections', () => {
    const rows = buildStatementRows({
      sections: [],
      terminus: { label: '本期淨利', cell: { amountText: 'NT$0' } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: 'terminus',
      label: '本期淨利',
      tone: 'terminus',
      level: 0,
    });
  });
});
