import { describe, expect, it } from 'vitest';

import { mapSettlementToPreviewVM } from '@/ui/features/project/viewmodels/settlementPreview.vm';

describe('settlementPreview.vm', () => {
  it('maps settlement to formatted preview vm', () => {
    const vm = mapSettlementToPreviewVM({
      projectId: 'p1',
      projectName: '旅遊基金',
      openingBalance: 10000,
      income: 3000,
      expense: 2500,
      closingBalance: 10500,
    });

    expect(vm.projectId).toBe('p1');
    expect(vm.projectName).toBe('旅遊基金');
    expect(vm.openingBalanceText).toContain('10,000');
    expect(vm.closingBalanceText).toContain('10,500');
  });
});
