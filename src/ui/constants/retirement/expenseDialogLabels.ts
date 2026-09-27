export const RetirementExpenseDialogLabels = {
  duration: 'Duration',
  lifelong: 'Lifelong',
  until: (endYear: string) => `Until ${endYear}`,
  growth: 'Growth',
  usingPlanInflation: (rate: number) => `Using plan inflation: ${rate}%`,
  growthPercent: (rate: number) => `${rate}% growth`,
  advanced: 'Advanced',
  debtDerivedHint: 'System-derived from debt repayment import.',
  lifelongPlaceholder: 'Lifelong',
  retirementYearPreview: (amount: number) =>
    `退休第一年支出約 ${Math.round(amount).toLocaleString()} /yr (估算)`,
} as const;
