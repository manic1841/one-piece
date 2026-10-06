import React from 'react';

import { useOutletContext } from 'react-router-dom';

import { AllocationTemplateSettings } from '@/ui/features/setting/components/AllocationTemplateSettings';
import { LedgerCodeSettings } from '@/ui/features/setting/components/LedgerCodeSettings';
import WatchListSettings from '@/ui/features/setting/components/WatchListSettings';
import { type SettingsAccessContext } from '@/ui/features/setting/hooks/useSettingsShell';
import { useWatchListPickerData } from '@/ui/features/setting/hooks/useWatchListPickerData';
import { SettingsSectionGate } from '@/ui/features/setting/pages/SettingsSectionGate';

const AccountingSettingsContent: React.FC = () => {
  const watchListPickerOptions = useWatchListPickerData();
  return (
    <div className="space-y-6">
      <LedgerCodeSettings />
      <AllocationTemplateSettings />
      <WatchListSettings pickerOptions={watchListPickerOptions} />
    </div>
  );
};

/** Accounting 區段：科目代碼、收入分配與觀察清單。 */
const AccountingSettingsPage: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return (
    <SettingsSectionGate access={access} authorized={access.isHouseholdOwnerOrAdmin}>
      <AccountingSettingsContent />
    </SettingsSectionGate>
  );
};

export default AccountingSettingsPage;
