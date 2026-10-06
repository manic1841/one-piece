/**
 * Settings 頁面外殼的顯示文字單一來源。
 *
 * 只收斂外殼自身擁有的字面（頁面標題、四區段頁籤、頁籤列 aria-label、載入與
 * 授權拒絕文案、System 橫幅，以及 Backup 區段的完整文案）。內層設定元件的字面
 * 仍住各自的元件檔，待該元件遷移時一併外部化。
 */

export const SettingsSectionLabels = {
  household: 'Household',
  accounting: 'Accounting',
  backup: 'Backup',
  system: 'System',
} as const;

export type SettingsSectionKey = keyof typeof SettingsSectionLabels;

/** 頁籤顯示順序；實際渲染清單再依角色過濾（見 `visibleSettingsSections`）。 */
export const SETTINGS_SECTION_ORDER: SettingsSectionKey[] = [
  'household',
  'accounting',
  'backup',
  'system',
];

export const SETTINGS_SECTION_PATHS: Record<SettingsSectionKey, string> = {
  household: '/settings/household',
  accounting: '/settings/accounting',
  backup: '/settings/backup',
  system: '/settings/system',
};

export const SettingsShellLabels = {
  title: 'Settings',
  description: 'Manage your household and system settings',
  tabsAriaLabel: '設定區段',
  loading: 'Loading...',
  accessDeniedDescription:
    'Only administrators or household owners/admins can access the Settings page.',
} as const;

export const SettingsSystemLabels = {
  bannerTitle: 'System Administrator Access',
  bannerDescription: 'You have full system privileges',
} as const;

export const SettingsBackupLabels = {
  sectionTitle: 'BACKUP & RESTORE',
  exportTitle: '備份資料庫',
  exportDescription: '匯出此 household 的完整資料（包含所有 snapshots）為 JSON 檔。',
  exportAction: '備份資料庫',
  exporting: '匯出中...',
  restoreTitle: '一鍵還原備份',
  restoreDescription: '選擇備份檔後立即還原，會覆蓋目前 household 的既有資料。',
  restoreAction: '還原備份',
  restoring: '還原中...',
  restoreConfirmTitle: '確認還原備份',
  restoreConfirmConsequence:
    '此操作會先刪除目前 household 既有資料，再以備份檔完整覆蓋。此動作無法復原。',
  restoreConfirmFilePrefix: '即將還原檔案：',
  restoreConfirmLabel: '確認還原',
  restoreCancelLabel: '取消',
} as const;
