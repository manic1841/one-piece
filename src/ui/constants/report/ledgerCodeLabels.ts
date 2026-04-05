export const LEDGER_CODE_LABELS: Record<string, string> = {
  // Income
  'income:salary': '薪資收入',
  'income:bonus': '獎金',
  'income:investment': '投資收益',
  'income:other': '其他收入',

  // Expense
  'expense:food': '餐飲',
  'expense:transportation': '交通',
  'expense:living': '生活',
  'expense:housing': '家居',
  'expense:rent': '房租',
  'expense:vehicle': '汽車',
  'expense:shopping': '購物',
  'expense:healthcare': '醫療',
  'expense:education': '教育',
  'expense:entertainment': '娛樂',
  'expense:insurance': '保險',
  'expense:social': '人情往來',
  'expense:interest': '利息支出',
  'expense:loan_interest': '借貸利息',
  'expense:mortgage_interest': '房貸利息',
  'expense:tax': '稅金',
  'expense:other': '其他支出',

  // Assets
  'asset:cash': '現金與銀行存款',
  'asset:investment': '證券投資',
  'asset:property': '不動產',

  // Liabilities
  'liability:loan': '貸款',
  'liability:mortgage': '房貸',

  // Equity
  'equity:owner_investment': '股東投入資本',
  'equity:owner_draw': '股東分紅',
  'equity:capital': '股東資本',

  // Income Additions
  'income:refund': '退款',
};

export const getLedgerLabel = (code: string): string => {
  return LEDGER_CODE_LABELS[code] || code;
};
