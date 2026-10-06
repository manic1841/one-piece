import React, { useRef } from 'react';

import { Download } from 'lucide-react';

import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { SettingsBackupLabels } from '@/ui/constants/setting/settingsLabels';

interface BackupSettingsProps {
  backupLoading: boolean;
  backupError: string;
  backupSuccess: string;
  onExport: () => Promise<void>;
  restoreLoading: boolean;
  restoreError: string;
  restoreSuccess: string;
  onRestore: (file: File) => Promise<void>;
}

/**
 * Backup 區段內容。破壞性還原走共用的 confirm dialog（不自刻 Dialog），狀態回饋走
 * `Alert`；外框由區段頁面提供。
 */
export const BackupSettings: React.FC<BackupSettingsProps> = ({
  backupLoading,
  backupError,
  backupSuccess,
  onExport,
  restoreLoading,
  restoreError,
  restoreSuccess,
  onRestore,
}) => {
  const { confirm } = useConfirm();
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreClick = () => {
    if (restoreLoading) return;
    restoreInputRef.current?.click();
  };

  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmed = await confirm({
      title: SettingsBackupLabels.restoreConfirmTitle,
      context: `${SettingsBackupLabels.restoreConfirmFilePrefix}${file.name}`,
      consequence: SettingsBackupLabels.restoreConfirmConsequence,
      confirmLabel: SettingsBackupLabels.restoreConfirmLabel,
      cancelLabel: SettingsBackupLabels.restoreCancelLabel,
    });

    if (confirmed) await onRestore(file);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ListSectionHeader
          title={SettingsBackupLabels.exportTitle}
          actions={
            <Button onClick={() => void onExport()} disabled={backupLoading}>
              <Download size={16} className="mr-2" aria-hidden="true" />
              {backupLoading ? SettingsBackupLabels.exporting : SettingsBackupLabels.exportAction}
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">{SettingsBackupLabels.exportDescription}</p>
      </div>

      <div className="space-y-2 border-t border-border pt-6">
        <ListSectionHeader
          title={SettingsBackupLabels.restoreTitle}
          actions={
            <Button variant="destructive" onClick={handleRestoreClick} disabled={restoreLoading}>
              {restoreLoading ? SettingsBackupLabels.restoring : SettingsBackupLabels.restoreAction}
            </Button>
          }
        />
        <p className="text-sm text-muted-foreground">{SettingsBackupLabels.restoreDescription}</p>
      </div>

      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleRestoreFileChange}
      />

      {backupError && (
        <Alert variant="destructive">
          <AlertDescription>{backupError}</AlertDescription>
        </Alert>
      )}
      {backupSuccess && (
        <Alert>
          <AlertDescription className="text-positive">{backupSuccess}</AlertDescription>
        </Alert>
      )}
      {restoreError && (
        <Alert variant="destructive">
          <AlertDescription>{restoreError}</AlertDescription>
        </Alert>
      )}
      {restoreSuccess && (
        <Alert>
          <AlertDescription className="text-positive">{restoreSuccess}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
