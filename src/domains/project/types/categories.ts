// ProjectCategory Enum
export const ProjectCategory = {
  // 一般專案（日常記帳）
  OPERATING: 'operating', // 營運類：生活、居住、交通

  // 特殊專案（會計報表）
  FINANCING: 'financing', // 融資類：房貸、車貸
  INVESTING: 'investing', // 投資類：股票、基金
  ASSET: 'asset', // 資產類：不動產、固定資產
  LIABILITY: 'liability', // 負債類：長期債務

  // 調節專案（差異處理）
  RECONCILIATION: 'reconciliation', // 調節類：現金短少、收入短少

  // 個人專案（不計入家庭報表）
  PERSONAL: 'personal', // 個人零用錢
} as const;

export type ProjectCategory = (typeof ProjectCategory)[keyof typeof ProjectCategory];
