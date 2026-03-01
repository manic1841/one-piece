import { describe, expect, it } from 'vitest';

import { createAccountSnapshot } from '../../../test/factory/accountFactories';
import {
  cashFlowImpactData,
  initialSnapshotData,
  missingAccountSnapshotData,
  regularUpdateData,
} from './__testHelpers__/portfolioTestData';
import { calculatePortfolioSnapshot } from './portfolioCalculator';

describe('portfolioCalculator', () => {
  describe('calculatePortfolioSnapshot', () => {
    it('should calculate initial snapshot correctly (no previous snapshot)', () => {
      const result = calculatePortfolioSnapshot(initialSnapshotData);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.totalValue).toBe(150000);
      expect(result.accounts).toHaveLength(2);

      const { performance } = result;
      expect(performance.openingValue).toBe(0);
      expect(performance.closingValue).toBe(150000);
      expect(performance.netCashFlow).toBe(0);
      expect(performance.gain).toBe(150000);
      expect(performance.returnRate).toBe(0); // Since openingValue + deposits = 0
      expect(performance.cumulativeGain).toBe(150000);
      expect(performance.cumulativeReturnRate).toBe(0); // Since totalInvested = 0 (150000 - 150000)
    });

    it('should calculate regular update correctly with previous snapshot', () => {
      const result = calculatePortfolioSnapshot(regularUpdateData);

      expect(result.totalValue).toBe(165000);

      const { performance } = result;
      expect(performance.openingValue).toBe(150000);
      expect(performance.closingValue).toBe(165000);
      expect(performance.netCashFlow).toBe(0);

      // Gain = 165000 - 150000 - 0 = 15000
      expect(performance.gain).toBe(15000);

      // Return Rate = 15000 / (150000 + 0) * 100 = 10%
      expect(performance.returnRate).toBe(10);

      // Cumulative Gain = 150000 (prev) + 15000 = 165000
      expect(performance.cumulativeGain).toBe(165000);

      // totalInvested = 165000 - 165000 = 0
      expect(performance.cumulativeReturnRate).toBe(0);
    });

    it('should account for cash flow impact on performance', () => {
      const result = calculatePortfolioSnapshot(cashFlowImpactData);

      expect(result.totalValue).toBe(165000);
      expect(result.cashFlow.deposits).toBe(10000);
      expect(result.cashFlow.withdrawals).toBe(2000);

      const { performance } = result;
      expect(performance.netCashFlow).toBe(8000); // 10000 - 2000

      // Gain = 165000 - 150000 - 8000 = 7000
      expect(performance.gain).toBe(7000);

      // Return Rate = 7000 / (150000 + 10000) * 100 = 7000 / 160000 * 100 = 4.375%
      expect(performance.returnRate).toBe(4.375);
    });

    it('should handle accounts without snapshots by setting value to 0', () => {
      const result = calculatePortfolioSnapshot(missingAccountSnapshotData);

      expect(result.totalValue).toBe(100000);
      expect(result.accounts).toHaveLength(2);

      const missingAcc = result.accounts.find((a: any) => a.value === 0);
      expect(missingAcc).toBeDefined();
      expect(missingAcc?.accountName).toBe('Bank Account');
    });

    it('should calculate cumulative return rate correctly when totalInvested > 0', () => {
      // Create a scenario where totalInvested > 0
      // totalInvested = closingValue - cumulativeGain
      // Let's say: prev closing was 100k (all gain), current closing 110k, cash flow 0.
      // Gain = 10k. Cumulative Gain 110k. totalInvested = 0.

      // To get totalInvested > 0, we need some non-gain value (e.g. initial deposits)
      const data = {
        ...regularUpdateData,
        prevSnapshot: {
          ...regularUpdateData.prevSnapshot!,
          performance: {
            ...regularUpdateData.prevSnapshot!.performance,
            openingValue: 0,
            closingValue: 100000,
            cumulativeGain: 20000, // 80k was invested
          },
        },
        accountSnapshots: new Map([
          [
            'account-1',
            createAccountSnapshot({ id: 'account-1', amount: 80000, year: 2024, month: 2 }),
          ],
          [
            'account-2',
            createAccountSnapshot({ id: 'account-2', amount: 40000, year: 2024, month: 2 }),
          ],
        ]), // Total Value = 120000
      };

      const result = calculatePortfolioSnapshot(data);

      // Closing = 120000
      // Opening = 100000
      // Gain = 120000 - 100000 = 20000
      // Cumulative Gain = 20000 (prev) + 20000 = 40000
      // totalInvested = 120000 - 40000 = 80000
      // Cumulative Return Rate = (40000 / 80000) * 100 = 50%

      expect(result.performance.cumulativeGain).toBe(40000);
      expect(result.performance.cumulativeReturnRate).toBe(50);
    });
  });
});
