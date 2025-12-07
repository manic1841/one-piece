export interface SettlementPreview {
  projectId: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  lastSnapshot: {
    year: number;
    month: number;
    balance: number;
  } | null;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  hasExistingSnapshot: boolean;
}
