import { describe, expect, it } from 'vitest';

import { CustomLedgerCodeSchema } from '@/domains/ledger/schemas';

import {
  WATCH_LIST_TARGET_TYPES,
  WatchListTargetCreateSchema,
  WatchListTargetSchema,
  buildWatchListDocId,
} from './schemas';

const baseCreate = {
  targetType: 'PROJECT',
  targetId: 'project-1',
  name: '媽媽專案',
} as const;

describe('watch list schemas', () => {
  it('parses a valid target create payload', () => {
    const parsed = WatchListTargetCreateSchema.parse(baseCreate);
    expect(parsed).toMatchObject(baseCreate);
  });

  it('rejects an unknown target type', () => {
    expect(() =>
      WatchListTargetCreateSchema.parse({ ...baseCreate, targetType: 'ACCOUNT' }),
    ).toThrow();
  });

  it('rejects an empty target id or name', () => {
    expect(() =>
      WatchListTargetCreateSchema.parse({ ...baseCreate, targetId: '' }),
    ).toThrow();
    expect(() =>
      WatchListTargetCreateSchema.parse({ ...baseCreate, name: '' }),
    ).toThrow();
  });

  it('extends BaseSchema with id and audit fields', () => {
    const now = new Date();
    const target = WatchListTargetSchema.parse({
      id: `${baseCreate.targetType}:${baseCreate.targetId}`,
      ...baseCreate,
      createdBy: 'user-1',
      createdAt: now,
      updatedBy: 'user-1',
      updatedAt: now,
    });
    expect(target.id).toBe('PROJECT:project-1');
    expect(target.createdAt).toEqual(now);
  });

  it('builds a namespaced doc id per target type', () => {
    expect(buildWatchListDocId('PROJECT', 'project-1')).toBe('PROJECT:project-1');
    expect(buildWatchListDocId('LEDGER_CODE', 'expense:travel')).toBe(
      'LEDGER_CODE:expense:travel',
    );
  });

  it('keeps ledger code schema importable (guard against circular domain imports)', () => {
    expect(CustomLedgerCodeSchema).toBeDefined();
  });
});

describe('WATCH_LIST_TARGET_TYPES', () => {
  it('contains exactly the three documented target types', () => {
    expect(WATCH_LIST_TARGET_TYPES).toEqual(['PROJECT', 'LEDGER_CODE', 'DEBT_ACCOUNT']);
  });
});
