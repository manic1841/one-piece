import React from 'react';

import { ShieldAlert } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { Module } from '@/ui/components/Module';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { SettingsModuleLabels, SettingsSystemLabels } from '@/ui/constants/setting/settingsLabels';
import EmailWhitelistUI from '@/ui/features/setting/components/EmailWhitelistUI';
import { type SettingsAccessContext } from '@/ui/features/setting/hooks/useSettingsShell';
import { useSystemSettingsPage } from '@/ui/features/setting/hooks/useSystemSettingsPage';
import { SettingsSectionGate } from '@/ui/features/setting/pages/SettingsSectionGate';

const SystemSettingsContent: React.FC = () => {
  const state = useSystemSettingsPage();
  return (
    <div className="space-y-6">
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertDescription>
          <p className="font-semibold">{SettingsSystemLabels.bannerTitle}</p>
          <p className="text-sm text-muted-foreground">{SettingsSystemLabels.bannerDescription}</p>
        </AlertDescription>
      </Alert>
      <Module label={SettingsModuleLabels.systemWhitelist}>
        <EmailWhitelistUI
          whitelist={state.whitelist}
          loading={state.loading}
          saving={state.saving}
          error={state.error}
          onAdd={state.addWhitelistEmail}
          onRemove={state.removeWhitelistEmail}
        />
      </Module>
    </div>
  );
};

/** System 區段：全域管理員存取與 email 白名單，僅全域管理員可見。 */
const SystemSettingsPage: React.FC = () => {
  const access = useOutletContext<SettingsAccessContext>();
  return (
    <SettingsSectionGate access={access} authorized={access.isAdmin}>
      <SystemSettingsContent />
    </SettingsSectionGate>
  );
};

export default SystemSettingsPage;
