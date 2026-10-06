import React from 'react';

import { useOutletContext } from 'react-router-dom';

import { Module } from '@/ui/components/Module';
import { SettingsModuleLabels } from '@/ui/constants/setting/settingsLabels';
import MemberManagementUI from '@/ui/features/setting/components/MemberManagementUI';
import { useHouseholdSettingsPage } from '@/ui/features/setting/hooks/useHouseholdSettingsPage';
import { type SettingsAccessContext } from '@/ui/features/setting/hooks/useSettingsShell';
import { SettingsSectionGate } from '@/ui/features/setting/pages/SettingsSectionGate';

const HouseholdSettingsContent: React.FC = () => {
  const state = useHouseholdSettingsPage();
  return (
    <Module label={SettingsModuleLabels.householdMembers}>
      <MemberManagementUI
        household={state.household}
        memberProfiles={state.memberProfiles}
        loading={state.memberLoading}
        error={state.memberError}
        success={state.memberSuccess}
        onAdd={state.addHouseholdMember}
        onRemove={state.removeHouseholdMember}
        onUpdateRole={state.updateMemberRole}
        currentUid={state.currentUid}
      />
    </Module>
  );
};

/** Household 區段：家庭成員與其權限。 */
const HouseholdSettingsPage: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return (
    <SettingsSectionGate access={access} authorized={access.isHouseholdOwnerOrAdmin}>
      <HouseholdSettingsContent />
    </SettingsSectionGate>
  );
};

export default HouseholdSettingsPage;
