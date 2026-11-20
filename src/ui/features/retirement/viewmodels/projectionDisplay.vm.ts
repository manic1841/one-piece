export interface RetirementProjectionPointVM {
  year: number;
  age: number;
  income: number;
  expense: number;
  /** Investment income earned on the opening balance that year (issue #265). */
  investmentIncome: number;
  /** Net worth change: inflows − outflows + investment return. */
  netCashFlow: number;
  savings: number;
  incomeText: string;
  expenseText: string;
  investmentIncomeText: string;
  netCashFlowText: string;
  savingsText: string;
  isBankruptYear: boolean;
  isRetired: boolean;
}

export interface RetirementProjectionYearDetailVM {
  year: number;
  age: number;
  isRetired: boolean;
  statusText: string;
  incomeText: string;
  expenseText: string;
  investmentReturnText: string;
  /** Signed net worth change behind `netCashFlowText`, for the tone of the net column. */
  netCashFlow: number;
  netCashFlowText: string;
  /** Net worth at the start of the year — the same basis as the retirement hero. */
  opening: number;
  openingText: string;
  savingsText: string;
}

export interface RetirementProjectionVM {
  retirementYear: number;
  /** Year net worth first dropped below zero; `null` when it never did. */
  negativeYear: number | null;
  chartData: RetirementProjectionPointVM[];
  yearlyDetails: RetirementProjectionYearDetailVM[];
}
