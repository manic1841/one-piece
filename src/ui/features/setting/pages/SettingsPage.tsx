import React from 'react';

import SettingsUI from '@/ui/features/setting/components/SettingsUI';
import { useSettingsPage } from '@/ui/features/setting/hooks/useSettingsPage';

const Settings: React.FC = () => {
  const pageState = useSettingsPage();

  return <SettingsUI {...pageState} />;
};

export default Settings;
