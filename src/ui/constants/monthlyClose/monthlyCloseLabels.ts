import { CLOSE_STAGE_IDS, type CloseStageId } from '@/domains/financial_period/schemas';

export const CLOSE_STAGE_LABELS: Record<CloseStageId, string> = {
  ACCOUNT_BALANCE: '銀行帳戶餘額',
  TRANSACTION_VALIDATION: '交易驗證',
  SECURITIES_TRADE: '證券買入／賣出',
  PORTFOLIO_CASH_FLOW: 'Portfolio 金流',
  PROJECT_SETTLEMENT: '專案結算',
  DEBT_REPAYMENT: '債務還款',
  COMPLETENESS_CHECK: 'Completeness Check',
  FINANCIAL_REPORTS: 'Financial Reports',
  CLOSE_PERIOD: 'Close Period',
};

export const getCloseStageLabel = (stageId: CloseStageId): string =>
  CLOSE_STAGE_LABELS[stageId] ?? stageId;

export const CLOSE_STAGE_ORDER: readonly CloseStageId[] = CLOSE_STAGE_IDS;

export const MONTHLY_CLOSE_LABELS = {
  PAGE_TITLE: '月度關帳',
  PAGE_SUBTITLE: 'MONTHLY CLOSE WORKFLOW',
  START: '開始關帳',
  BUY: '買入',
  SELL: '賣出',
  SHAREHOLDER_FINANCING: '股東融資',
  DIVIDEND_PAYOUT: '發放分紅',
  DEPOSIT: '存入',
  WITHDRAW: '領出',
  STARTED: '關帳進行中',
  CONFIRM: '確認此階段',
  RECONFIRM: '階段已完成',
  RESOLVE_REVIEW: '審閱完畢，繼續關帳',
  FINALIZED: '本期已完成關帳',
  FINALIZED_SUBTITLE: 'FINALIZED',
  PAUSED: '已暫停，待審閱',
  NEEDS_REVIEW: 'NEEDS REVIEW',
  CLOSED: 'CLOSED',
  IN_PROGRESS: 'IN PROGRESS',
  OPEN: 'OPEN',
  NOT_STARTED: 'NOT STARTED',
  PROGRESS_LABEL: '關帳進度',
  PERIOD_LABEL: '關帳期間',
  EVIDENCE_LABEL: '階段證據',
  INPUTS_LABEL: '階段輸入',
  NO_EVIDENCE: '尚無階段證據。',
  STAGE_GUIDANCE: '階段順序僅為引導，可依需求調整確認順序。',
  LOADING: '載入中...',
  LOAD_ERROR: '無法載入關帳狀態。',
  CONFIRM_ERROR: '確認失敗，請稍後再試。',
  START_ERROR: '無法開始關帳。',
  SELECT_PERIOD: '選擇關帳期間',
  READY: '就緒',
  NOT_READY: '未就緒',
  PERSISTED: '已產生',
  NOT_PERSISTED: '尚未產生',
  ZERO_ACTIVITY: '零活動',
  TRANSACTION_ISSUES: '交易驗證問題',
  ADJUSTMENT: '現金流調整',
  REPORTS_PERSISTENCE: '報表產生狀態',
} as const;
