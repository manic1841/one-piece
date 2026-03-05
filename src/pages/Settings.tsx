import React from 'react';

import SettingsUI from '@/components/settings/SettingsUI';
import { useSettingsPage } from '@/hooks/pages/useSettingsPage';

const Settings: React.FC = () => {
  const pageState = useSettingsPage();

  return <SettingsUI {...pageState} />;
};

export default Settings;
