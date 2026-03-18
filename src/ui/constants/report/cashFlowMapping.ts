export const CASH_FLOW_MAPPING = {
  operating: {
    income: ['income:salary', 'income:bonus', 'income:other'],
    expense: [
      'expense:food', 'expense:transport', 'expense:housing',
      'expense:rent', 'expense:shopping', 'expense:healthcare',
      'expense:education', 'expense:entertainment',
      'expense:insurance', 'expense:social', 'expense:other',
    ],
  },
  investing: {
    income: ['income:investment'],
    expense: ['asset:investment', 'expense:vehicle'],
  },
  financing: {
    income: ['liability:loan'],
    expense: ['liability:credit', 'liability:loan'],
  },
} as const;
