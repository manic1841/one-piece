import { type Role } from '@/domains/household/role';

/**
 * Settings 的顯示文字單一來源：外殼、各區段頁面框架，以及區段內容元件。
 *
 * 單一檔案而非按「外殼／內容」拆檔——兩者都是同一個 feature 的顯示字面，拆檔只會
 * 讓跨區段共用的字面（載入、email 範例…）無處安放、被迫複製。
 */

/** 跨區段共用的載入字面。 */
export const SETTINGS_LOADING_TEXT = 'Loading...';

/** 跨區段共用的進行中字面。 */
export const SETTINGS_ADDING_TEXT = 'Adding...';

/** 跨區段共用的 email 輸入範例。 */
export const SETTINGS_EMAIL_PLACEHOLDER = 'user@example.com';

/** 移除類確認對話框共用的確認動詞。 */
export const SETTINGS_REMOVE_CONFIRM_LABEL = 'REMOVE';

// ── 外殼（頁面框架）──────────────────────────────────────────────────────────

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

/** 區段路徑，推導自區段鍵名（`/settings/<key>`）——不手寫第二份清單。 */
export const SETTINGS_SECTION_PATHS = Object.fromEntries(
  SETTINGS_SECTION_ORDER.map((key) => [key, `/settings/${key}`]),
) as Record<SettingsSectionKey, string>;

export const SettingsShellLabels = {
  title: 'Settings',
  description: 'Manage your household and system settings',
  tabsAriaLabel: '設定區段',
  loading: SETTINGS_LOADING_TEXT,
  accessDeniedDescription:
    'Only administrators or household owners/admins can access the Settings page.',
} as const;

export const SettingsSystemLabels = {
  bannerTitle: 'System Administrator Access',
  bannerDescription: 'You have full system privileges',
} as const;

/** 各區段頁面用以包住內容元件的 `Module` 標籤（頁面層擁有的外框文字）。 */
export const SettingsModuleLabels = {
  householdMembers: 'MEMBERS',
  accountingLedgerCodes: 'LEDGER CODES',
  accountingAllocation: 'INCOME ALLOCATION',
  systemWhitelist: 'EMAIL WHITELIST',
  backup: 'BACKUP & RESTORE',
} as const;

// ── Household 區段 ──────────────────────────────────────────────────────────

export const SETTINGS_MEMBER_ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

export const SettingsHouseholdLabels = {
  addTitle: 'Add New Member',
  emailLabel: 'Email Address',
  emailPlaceholder: SETTINGS_EMAIL_PLACEHOLDER,
  roleLabel: 'Assign Role',
  roleFieldLabel: 'Role',
  errorEmailRequired: 'Please enter an email address',
  errorEmailInvalid: 'Please enter a valid email address',
  addAction: 'Add Member',
  adding: SETTINGS_ADDING_TEXT,
  membersTitle: 'Current Members',
  selfBadge: 'You',
  /** 成員 profile 尚未載入時顯示的名字。 */
  nameLoading: SETTINGS_LOADING_TEXT,
  removeConfirmTitle: 'Remove this member?',
  removeConfirmConsequence: 'They will lose access to this household immediately.',
  removeConfirmLabel: SETTINGS_REMOVE_CONFIRM_LABEL,
  removeAction: 'Remove member',
} as const;

// ── System 區段 ─────────────────────────────────────────────────────────────

export const SettingsWhitelistLabels = {
  description: 'Only whitelisted users can access this application',
  loading: SETTINGS_LOADING_TEXT,
  listTitle: 'Whitelisted Emails',
  addLabel: 'Add Email to Whitelist',
  emailPlaceholder: SETTINGS_EMAIL_PLACEHOLDER,
  addAction: 'Add',
  emptyTitle: 'NO WHITELISTED USERS',
  emptyDescription: 'Add the first email address to allow access to this application.',
  removeAction: 'Remove',
  removeConfirmTitle: 'Remove this email?',
  removeConfirmConsequence: 'They will no longer be able to sign in to this application.',
  removeConfirmLabel: SETTINGS_REMOVE_CONFIRM_LABEL,
  errorEmailRequired: 'Please enter an email address',
  errorEmailInvalid: 'Please enter a valid email address',
  errorEmailDuplicate: 'This email is already in the whitelist',
} as const;

// ── Accounting 區段 ─────────────────────────────────────────────────────────

/** 使用者可建立的科目類型（不含 equity——自訂科目只開放這四種）。 */
export const SETTINGS_LEDGER_TYPE_LABELS = {
  asset: 'Asset (資產)',
  liability: 'Liability (負債)',
  income: 'Income (收入)',
  expense: 'Expense (支出)',
} as const;

export type SettingsLedgerType = keyof typeof SETTINGS_LEDGER_TYPE_LABELS;

/**
 * 科目類型的顯示與分組順序——單一來源。
 *
 * 由 `SETTINGS_LEDGER_TYPE_LABELS` 的鍵序推導，元件與 hook 都不得另寫一份清單。
 */
export const SETTINGS_LEDGER_TYPE_ORDER = Object.keys(
  SETTINGS_LEDGER_TYPE_LABELS,
) as SettingsLedgerType[];

export const SettingsLedgerCodeLabels = {
  addAction: 'Add Category',
  adding: SETTINGS_ADDING_TEXT,
  dialogTitle: 'Add Custom Category or Detail',
  dialogDescription: '建立新的自訂科目，或是在既有 category 底下建立明細科目。',
  cancelAction: 'Cancel',
  typeLabel: 'Type',
  codeLabel: '科目代碼 (Slug)',
  codePlaceholder: 'property 或 property:taipei',
  codeHelpPrefix: 'category',
  codeHelpMiddle: ' 建立科目；',
  codeHelpDetail: 'category:detail',
  codeHelpSuffix: ' 在既有 category 底下建立明細科目。',
  labelLabel: 'Display Name (Label)',
  labelPlaceholder: 'e.g. 差旅費',
  errorCodeRequired: '請輸入科目代碼。',
  errorLabelRequired: '請輸入顯示名稱。',
  systemBadge: 'System',
  activeAction: 'Active',
  disabledAction: 'Disabled',
  editAction: 'Edit label',
  saveAction: 'Save',
  editInputLabel: 'Category label',
  groupSuffix: 'Categories',
  emptyGroup: 'No categories defined for this type.',
} as const;

export const SettingsAllocationLabels = {
  formTitleCreate: 'Create Template',
  formTitleEdit: 'Edit Template',
  newAction: 'New',
  nameLabel: 'Template Name',
  namePlaceholder: 'e.g. Charles Salary',
  ledgerLabel: 'Income LedgerCode',
  ledgerPlaceholder: 'income:salary:charles',
  defaultLabel: 'Use as default fallback template',
  projectPlaceholder: 'Select project',
  addItemAction: 'Add Item',
  totalPrefix: 'Total',
  itemsEmpty: 'No allocation items yet.',
  percentageLabel: 'Percentage',
  errorItemsRequired: '請至少加入一個分配項目。',
  errorTotal: '分配比例總和必須為 100%。',
  removeItemAction: 'Remove allocation item',
  saveAction: 'Save Template',
  deleteAction: 'Delete template',
  existingTitle: 'Existing Templates',
  templatesEmpty: 'No templates yet.',
  defaultBadge: 'default',
  editAction: 'Edit template',
} as const;

export const SettingsBackupLabels = {
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
