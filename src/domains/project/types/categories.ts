export const ProjectCategory = {
  OPERATING: 'OPERATING',
  FINANCING: 'FINANCING',
  INVESTING: 'INVESTING',
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  RECONCILIATION: 'RECONCILIATION',
  PERSONAL: 'PERSONAL',
  EQUITY: 'EQUITY',
} as const;

export type ProjectCategory = (typeof ProjectCategory)[keyof typeof ProjectCategory];
