export const LEDGER_CODE_LABELS: Record<string, string> = {
  'income:salary': '薪資收入',
  'income:bonus': '獎金',
  'income:investment': '投資收益',
  'income:other': '其他收入',
  'expense:food': '餐飲',
  'expense:transport': '交通',
  'expense:housing': '居住',
  'expense:rent': '房租',
  'expense:vehicle': '汽車',
  'expense:shopping': '購物',
  'expense:healthcare': '醫療',
  'expense:education': '教育',
  'expense:entertainment': '娛樂',
  'expense:insurance': '保險',
  'expense:social': '人情往來',
  'expense:other': '其他支出',
};

export const getLedgerLabel = (code: string): string => {
  return LEDGER_CODE_LABELS[code] || code;
};
