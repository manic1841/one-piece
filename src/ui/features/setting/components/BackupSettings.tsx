import React, { useRef } from 'react';

import { Database, Download } from 'lucide-react';

import { PageSection } from '@/ui/components/PageSection';
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
 * Backup 區段的呈現。沿用頁面層的 section band，破壞性還原走共用的 confirm
 * dialog（不再自刻 Dialog），狀態回饋走 `Alert`。
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
    <PageSection title={SettingsBackupLabels.sectionTitle}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Database size={18} aria-hidden="true" />
              {SettingsBackupLabels.exportTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {SettingsBackupLabels.exportDescription}
            </p>
          </div>
          <Button onClick={() => void onExport()} disabled={backupLoading}>
            <Download size={16} className="mr-2" aria-hidden="true" />
            {backupLoading ? SettingsBackupLabels.exporting : SettingsBackupLabels.exportAction}
          </Button>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {SettingsBackupLabels.restoreTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {SettingsBackupLabels.restoreDescription}
            </p>
          </div>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleRestoreFileChange}
          />
          <Button variant="destructive" onClick={handleRestoreClick} disabled={restoreLoading}>
            {restoreLoading ? SettingsBackupLabels.restoring : SettingsBackupLabels.restoreAction}
          </Button>
        </div>

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
    </PageSection>
  );
};
