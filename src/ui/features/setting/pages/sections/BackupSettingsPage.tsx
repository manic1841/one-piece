import React from 'react';

import { useOutletContext } from 'react-router-dom';

import { Module } from '@/ui/components/Module';
import { SettingsModuleLabels } from '@/ui/constants/setting/settingsLabels';
import { BackupSettings } from '@/ui/features/setting/components/BackupSettings';
import { useBackupSettingsPage } from '@/ui/features/setting/hooks/useBackupSettingsPage';
import { type SettingsAccessContext } from '@/ui/features/setting/hooks/useSettingsShell';
import { SettingsSectionGate } from '@/ui/features/setting/pages/SettingsSectionGate';

const BackupSettingsContent: React.FC = () => {
  const state = useBackupSettingsPage();
  return (
    <Module label={SettingsModuleLabels.backup}>
      <BackupSettings
        backupLoading={state.backupLoading}
        backupError={state.backupError}
        backupSuccess={state.backupSuccess}
        onExport={state.exportHouseholdBackup}
        restoreLoading={state.restoreLoading}
        restoreError={state.restoreError}
        restoreSuccess={state.restoreSuccess}
        onRestore={state.restoreHouseholdBackup}
      />
    </Module>
  );
};

/** Backup 區段：household 資料的 JSON 匯出與還原。 */
const BackupSettingsPage: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return (
    <SettingsSectionGate access={access} authorized={access.isHouseholdOwnerOrAdmin}>
      <BackupSettingsContent />
    </SettingsSectionGate>
  );
};

export default BackupSettingsPage;
