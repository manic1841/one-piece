import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { tradeRowKey } from '../../../viewmodels/tradeDraft.vm';
import { useTradeDrawer } from './useTradeDrawer';

const renderDrawer = () => renderHook(() => useTradeDrawer({ closeMonth: new Date('2026-08-15') }));

describe('useTradeDrawer', () => {
  it('resolves an ADD command for a new row, dated in the close month', () => {
    const { result } = renderDrawer();
    act(() => result.current.open('SECURITIES', 'ADD'));

    expect(result.current.resolveCommand({ side: 'BUY', amount: 100, projectId: null })).toEqual({
      type: 'ADD',
      bucket: 'buys',
      row: { amount: 100, description: undefined, projectId: null, date: new Date('2026-08-15') },
    });
  });

  // Regression: addressing an unsaved row by ID made EDIT duplicate it; it must carry its key.
  it('resolves a REPLACE for an unsaved row addressed by its positional key', () => {
    const { result } = renderDrawer();
    const rowKey = tradeRowKey('buys', {}, 0);
    act(() => result.current.open('SECURITIES', 'EDIT', rowKey));

    const command = result.current.resolveCommand(
      { side: 'BUY', amount: 99, projectId: null },
      { amount: 10, date: new Date('2026-08-05'), projectId: null },
    );

    expect(command).toMatchObject({ type: 'REPLACE', rowKey, toBucket: 'buys' });
    expect(command).toMatchObject({ row: { amount: 99, date: new Date('2026-08-05') } });
  });

  it('moves an edited row to the bucket of the newly chosen side', () => {
    const { result } = renderDrawer();
    act(() => result.current.open('SECURITIES', 'EDIT', 'tx-1'));

    const command = result.current.resolveCommand(
      { side: 'SELL', amount: 5, projectId: null },
      { transactionId: 'tx-1', amount: 5, date: new Date('2026-08-05'), projectId: null },
    );

    expect(command).toMatchObject({ type: 'REPLACE', rowKey: 'tx-1', toBucket: 'sells' });
  });

  it('resolves a DELETE for the targeted row, and none when nothing is targeted', () => {
    const { result } = renderDrawer();
    expect(result.current.resolveDelete()).toBeNull();

    act(() => result.current.open('FINANCING', 'EDIT', 'fin:0'));
    expect(result.current.resolveDelete()).toEqual({ type: 'DELETE', rowKey: 'fin:0' });
  });

  it('resolves nothing to submit when no drawer is open', () => {
    const { result } = renderDrawer();
    expect(result.current.resolveCommand({ side: 'BUY', amount: 1, projectId: null })).toBeNull();
  });
});
