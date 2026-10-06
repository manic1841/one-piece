import React from 'react';

import { useOutletContext } from 'react-router-dom';

import { Module } from '@/ui/components/Module';
import { SettingsModuleLabels } from '@/ui/constants/setting/settingsLabels';
import { AllocationTemplateSettings } from '@/ui/features/setting/components/AllocationTemplateSettings';
import { LedgerCodeSettings } from '@/ui/features/setting/components/LedgerCodeSettings';
import { type SettingsAccessContext } from '@/ui/features/setting/hooks/useSettingsShell';
import { SettingsSectionGate } from '@/ui/features/setting/pages/SettingsSectionGate';

const AccountingSettingsContent: React.FC = () => {
  return (
    <div className="space-y-8">
      <Module label={SettingsModuleLabels.accountingLedgerCodes}>
        <LedgerCodeSettings />
      </Module>
      <Module label={SettingsModuleLabels.accountingAllocation}>
        <AllocationTemplateSettings />
      </Module>
    </div>
  );
};

/** Accounting 區段：科目代碼與收入分配。 */
const AccountingSettingsPage: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return (
    <SettingsSectionGate access={access} authorized={access.isHouseholdOwnerOrAdmin}>
      <AccountingSettingsContent />
    </SettingsSectionGate>
  );
};

export default AccountingSettingsPage;
