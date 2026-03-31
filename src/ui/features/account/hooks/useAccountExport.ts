import { useCallback, useMemo } from 'react';

import { getAccountSnapshotsUseCase } from '@/application/account/use_cases/getAccountSnapshotsUseCase';
import { type AccountSnapshotCreate } from '@/domains/account/types';
import { useAuth } from '@/infra/contexts/useAuth';

import { useAccountCmds } from './useAccountCmds';
import { useAccounts } from './useAccounts';

interface ExportData {
  date: string;
  accountName: string;
  currency: string;
  amount: number;
  originalAmount: number;
  exchangeRate: number;
}

export function useAccountExport() {
  const { userProfile, isAdmin, currentUser } = useAuth();
  const householdId = userProfile?.householdId || '';
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

  const { fetchAccountsWithSnapshots } = useAccounts();
  const { recordSnapshot } = useAccountCmds(householdId);

  const exportToCSV = useCallback(async () => {
    if (!householdId) return;

    const accounts = await fetchAccountsWithSnapshots(householdId, auth, {
      includeInactive: true,
    });
    const allData: ExportData[] = [];

    for (const account of accounts) {
      const snapshots = await getAccountSnapshotsUseCase.execute({
        householdId,
        accountId: account.id,
        auth,
      });

      snapshots.forEach((s) => {
        allData.push({
          date: `${s.year}-${s.month.toString().padStart(2, '0')}`,
          accountName: account.name,
          currency: account.currency,
          amount: s.amount,
          originalAmount: s.originalAmount || s.amount,
          exchangeRate: s.exchangeRate || 1,
        });
      });
    }

    // Sort by date desc, then account name
    allData.sort(
      (a, b) => b.date.localeCompare(a.date) || a.accountName.localeCompare(b.accountName),
    );

    const headers = ['日期', '帳戶名稱', '幣別', '結算金額(TWD)', '原幣金額', '匯率'];
    const csvRows = [
      headers.join(','),
      ...allData.map((d) =>
        [d.date, d.accountName, d.currency, d.amount, d.originalAmount, d.exchangeRate].join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `account_settlements_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [householdId, auth, fetchAccountsWithSnapshots]);

  const importFromCSV = useCallback(
    async (file: File): Promise<{ success: number; failed: number; errors: string[] }> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/);
          if (lines.length <= 1) {
            resolve({ success: 0, failed: 0, errors: ['檔案內容為空'] });
            return;
          }

          const headerLine = lines[0].trim();
          const expectedHeaders = ['日期', '帳戶名稱', '幣別', '結算金額(TWD)', '原幣金額', '匯率'];
          if (!headerLine.includes('日期') || !headerLine.includes('帳戶名稱')) {
            resolve({
              success: 0,
              failed: 0,
              errors: [`檔案標題不正確。應包含: ${expectedHeaders.join(',')}`],
            });
            return;
          }

          const accounts = await fetchAccountsWithSnapshots(householdId, auth, {
            includeInactive: true,
          });
          let successCount = 0;
          let failedCount = 0;
          const errors: string[] = [];

          // Skip header
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            const dateStr = parts[0];
            const accountName = parts[1];
            // Skip parts[2] (currency)
            const amountStr = parts[3];
            const originalAmountStr = parts[4];
            const exchangeRateStr = parts[5];

            const account = accounts.find((a) => a.name === accountName);
            if (!account) {
              failedCount++;
              errors.push(`第 ${i + 1} 行：找不到帳戶 "${accountName}"`);
              continue;
            }

            const [year, month] = dateStr.split('-').map((n) => parseInt(n));
            if (isNaN(year) || isNaN(month)) {
              failedCount++;
              errors.push(`第 ${i + 1} 行：日期格式錯誤 "${dateStr}"`);
              continue;
            }

            try {
              const snapshot: AccountSnapshotCreate = {
                accountId: account.id,
                year,
                month,
                amount: parseFloat(amountStr) || 0,
                originalAmount: parseFloat(originalAmountStr) || parseFloat(amountStr) || 0,
                exchangeRate: parseFloat(exchangeRateStr) || 1,
              };

              await recordSnapshot(account.id, snapshot);
              successCount++;
            } catch (err) {
              failedCount++;
              errors.push(`第 ${i + 1} 行：匯入失敗 - ${(err as Error).message}`);
            }
          }

          resolve({ success: successCount, failed: failedCount, errors });
        };
        reader.readAsText(file);
      });
    },
    [householdId, auth, fetchAccountsWithSnapshots, recordSnapshot],
  );

  return { exportToCSV, importFromCSV };
}
