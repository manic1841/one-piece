import { type AssetDataPoint, type ChartDataPoint } from '@/domains/account/types';
import { accountService } from '@/services/accountService';

interface AccountTrend {
  accountId: string;
  accountName: string;
  data: Array<{ date: string; balance: number }>;
}

class AssetTrackingService {
  // Get asset trend over time
  async getAssetTrend(householdId: string, months: number = 12): Promise<AssetDataPoint[]> {
    const accounts = await accountService.getAccounts(householdId);
    const dataPoints: Map<string, AssetDataPoint> = new Map();

    // Get snapshots for each account
    for (const account of accounts) {
      const snapshots = await accountService.getSnapshots(householdId, account.id);

      // Process each snapshot
      for (const snapshot of snapshots) {
        const dateKey = `${snapshot.year}/${String(snapshot.month).padStart(2, '0')}`;

        if (!dataPoints.has(dateKey)) {
          dataPoints.set(dateKey, {
            date: dateKey,
            totalAssets: 0,
            accounts: {},
          });
        }

        const point = dataPoints.get(dateKey)!;
        point.accounts[account.id] = snapshot.amount;
        point.totalAssets += snapshot.amount;
      }
    }

    // Sort by date and limit to requested months
    const sortedData = Array.from(dataPoints.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-months);
    return sortedData;
  }

  // Get individual account trends
  async getAccountTrends(householdId: string, months: number = 12): Promise<AccountTrend[]> {
    const accounts = await accountService.getAccounts(householdId);
    const trends: AccountTrend[] = [];

    for (const account of accounts) {
      const snapshots = await accountService.getSnapshots(householdId, account.id);

      const data = snapshots
        .map((snapshot) => ({
          date: `${snapshot.year}/${String(snapshot.month).padStart(2, '0')}`,
          balance: snapshot.amount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-months);

      if (data.length > 0) {
        trends.push({
          accountId: account.id,
          accountName: account.name,
          data,
        });
      }
    }

    return trends;
  }

  async getAccountTrend(householdId: string, accountId: string) {
    const snapshots = await accountService.getSnapshots(householdId, accountId);

    const chartData: ChartDataPoint[] = snapshots
      .map((snapshot) => ({
        month: `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`,
        amount: snapshot.amount,
        date: new Date(snapshot.year, snapshot.month - 1),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate trend
    const trend =
      chartData.length >= 2 ? chartData[chartData.length - 1].amount - chartData[0].amount : 0;
    const trendPercentage =
      chartData.length >= 2 && chartData[0].amount !== 0
        ? ((trend / Math.abs(chartData[0].amount)) * 100).toFixed(1)
        : '0.0';

    return { chartData, trend, trendPercentage };
  }

  // Calculate growth percentage
  calculateGrowth(data: AssetDataPoint[]): number {
    if (data.length < 2) return 0;

    const oldest = data[0].totalAssets;
    const newest = data[data.length - 1].totalAssets;

    if (oldest === 0) return 0;

    return ((newest - oldest) / oldest) * 100;
  }
}

export const assetTrackingService = new AssetTrackingService();
