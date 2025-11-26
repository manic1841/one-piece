import { accountService } from './accountService';

export interface AssetDataPoint {
    date: string;
    totalAssets: number;
    accounts: Record<string, number>;
}

interface AccountTrend {
    accountId: string;
    accountName: string;
    data: Array<{ date: string; balance: number }>;
}

export const assetTrackingService = {
    // Get asset trend over time
    async getAssetTrend(householdId: string, months: number = 12): Promise<AssetDataPoint[]> {
        const accounts = await accountService.getAccounts(householdId);
        const dataPoints: Map<string, AssetDataPoint> = new Map();

        // Get snapshots for each account
        for (const account of accounts) {
            const snapshots = await accountService.getBalanceSnapshots(account.id);

            // Process each snapshot
            for (const snapshot of snapshots) {
                const dateKey = `${snapshot.year}/${String(snapshot.month).padStart(2, '0')}`;

                if (!dataPoints.has(dateKey)) {
                    dataPoints.set(dateKey, {
                        date: dateKey,
                        totalAssets: 0,
                        accounts: {}
                    });
                }

                const point = dataPoints.get(dateKey)!;
                point.accounts[account.id] = snapshot.balance;
                point.totalAssets += snapshot.balance;
            }
        }

        // Sort by date and limit to requested months
        const sortedData = Array.from(dataPoints.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-months);

        return sortedData;
    },

    // Get individual account trends
    async getAccountTrends(householdId: string, months: number = 12): Promise<AccountTrend[]> {
        const accounts = await accountService.getAccounts(householdId);
        const trends: AccountTrend[] = [];

        for (const account of accounts) {
            const snapshots = await accountService.getBalanceSnapshots(account.id);

            const data = snapshots
                .map(snapshot => ({
                    date: `${snapshot.year}/${String(snapshot.month).padStart(2, '0')}`,
                    balance: snapshot.balance
                }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-months);

            if (data.length > 0) {
                trends.push({
                    accountId: account.id,
                    accountName: account.name,
                    data
                });
            }
        }

        return trends;
    },

    // Get asset allocation by account type
    async getAssetAllocation(householdId: string): Promise<Record<string, number>> {
        const latestSnapshots = await accountService.getLatestSnapshots(householdId);
        const accounts = await accountService.getAccounts(householdId);

        const allocation: Record<string, number> = {};

        for (const account of accounts) {
            const snapshot = latestSnapshots.get(account.id);
            if (snapshot) {
                const accountType = account.type;
                allocation[accountType] = (allocation[accountType] || 0) + snapshot.balance;
            }
        }

        return allocation;
    },

    // Calculate growth percentage
    calculateGrowth(data: AssetDataPoint[]): number {
        if (data.length < 2) return 0;

        const oldest = data[0].totalAssets;
        const newest = data[data.length - 1].totalAssets;

        if (oldest === 0) return 0;

        return ((newest - oldest) / oldest) * 100;
    }
};
