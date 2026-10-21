import { type MoneyTone } from '@/ui/components/moneyTone';

export interface RetirementProjectionPointVM {
  year: number;
  age: number;
  income: number;
  expense: number;
  /** Investment income earned on the opening balance that year (issue #265). */
  investmentIncome: number;
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
  netCashFlowText: string;
  savingsText: string;
  incomeItems: Array<{ name: string; amountText: string }>;
  expenseItems: Array<{ name: string; amountText: string }>;
}

export interface ExpenseBreakdownSlice {
  name: string;
  value: number;
  type: 'fixed' | 'variable';
}

export interface RetirementRiskVM {
  key: 'retirementYear' | 'bankruptcyYear' | 'minSavingsYear' | 'lifeExpectancyEnd';
  label: string;
  valueText: string;
  tone: MoneyTone;
}

export interface RetirementProjectionVM {
  retirementYear: number;
  retirementSavingsText: string;
  minYearText: string;
  minSavingsText: string;
  bankruptText: string;
  bankruptTone: MoneyTone;
  chartData: RetirementProjectionPointVM[];
  yearlyDetails: RetirementProjectionYearDetailVM[];
  expenseBreakdownChartData: ExpenseBreakdownSlice[] | null;
  risks: RetirementRiskVM[];
}
