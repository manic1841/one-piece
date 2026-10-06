import { useState } from 'react';

import { exportHouseholdBackupUseCase } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import { importHouseholdBackupUseCase } from '@/application/household/use_cases/importHouseholdBackupUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Backup 區段的控制器：household 等級的 JSON 匯出與還原。匯出／還原只依賴
 * `householdId`，不載入整個 household 文檔。
 */
export function useBackupSettingsPage() {
  const { userProfile } = useAuthState();
  const authContext = useAuthIdentity();
  const householdId = userProfile?.householdId;

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const exportHouseholdBackup = async () => {
    if (!householdId) return;

    setBackupLoading(true);
    setBackupError('');
    setBackupSuccess('');

    try {
      const backup = await exportHouseholdBackupUseCase.execute({
        householdId,
        auth: authContext,
      });

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateCode = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('href', url);
      link.setAttribute('download', `household-backup-${householdId}-${dateCode}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess('備份檔已匯出完成。');
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : '匯出備份失敗');
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreHouseholdBackup = async (file: File) => {
    if (!householdId) return;

    setRestoreLoading(true);
    setRestoreError('');
    setRestoreSuccess('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Parameters<
        typeof importHouseholdBackupUseCase.execute
      >[0]['backup'];

      const summary = await importHouseholdBackupUseCase.execute({
        householdId,
        auth: authContext,
        backup: parsed,
      });

      setRestoreSuccess(
        `還原完成：已清除 ${summary.deletedDocuments} 筆，並匯入 ${summary.restoredDocuments} 筆資料。`,
      );
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : '還原備份失敗');
    } finally {
      setRestoreLoading(false);
    }
  };

  return {
    backupLoading,
    backupError,
    backupSuccess,
    exportHouseholdBackup,
    restoreLoading,
    restoreError,
    restoreSuccess,
    restoreHouseholdBackup,
  };
}
