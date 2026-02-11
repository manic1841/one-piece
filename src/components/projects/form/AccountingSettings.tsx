import { useEffect, useState } from 'react';

import FinancialStatementForm from '@/components/projects/form/FinancialStatementForm';
import {
  AssetSubCategoryOptions,
  BalanceSheetCategoryOptions,
  CashFlowCategoryOptions,
  EquitySubCategoryOptions,
  ExpenseSubCategoryOptions,
  FinancingSubCategoryOptions,
  IncomeStatementCategoryOptions,
  IncomeSubCategoryOptions,
  InvestingSubCategoryOptions,
  LiabilitySubCategoryOptions,
  OperatingSubCategoryOptions,
} from '@/constants/finance/financeLabel';
import {
  BalanceSheetCategory,
  CashFlowCategory,
  IncomeStatementCategory,
} from '@/domains/finance/types/category';
import type { ProjectFormData } from '@/domains/project/types/projectForm';

interface AccountingSettingsProps {
  data?: ProjectFormData;
  onChanged: (data: Partial<ProjectFormData>) => void;
}

const incomeStatementSubcategoryMap = {
  [IncomeStatementCategory.INCOME]: IncomeSubCategoryOptions,
  [IncomeStatementCategory.EXPENSE]: ExpenseSubCategoryOptions,
};

const cashFlowSubcategoryMap = {
  [CashFlowCategory.OPERATING]: OperatingSubCategoryOptions,
  [CashFlowCategory.INVESTING]: InvestingSubCategoryOptions,
  [CashFlowCategory.FINANCING]: FinancingSubCategoryOptions,
};

const balanceSheetSubcategoryMap = {
  [BalanceSheetCategory.ASSET]: AssetSubCategoryOptions,
  [BalanceSheetCategory.LIABILITY]: LiabilitySubCategoryOptions,
  [BalanceSheetCategory.EQUITY]: EquitySubCategoryOptions,
};

type StatementData = { category: string; subcategory?: string; order?: number };

const createStatementHandler =
  (
    setAccounting: React.Dispatch<React.SetStateAction<ProjectFormData['accounting']>>,
    field: 'incomeStatement' | 'cashFlow' | 'balanceSheet',
  ) =>
  (statementData: StatementData) => {
    setAccounting((prev) => ({
      ...prev,
      [field]: statementData,
    }));
  };

// eslint-disable-next-line complexity
const AccountingSettings: React.FC<AccountingSettingsProps> = ({ data, onChanged }) => {
  const [accounting, setAccounting] = useState(data?.accounting || { enabled: false });

  useEffect(() => {
    onChanged({ accounting });
  }, [accounting, onChanged]);

  const handleIncomeStatementChange = createStatementHandler(setAccounting, 'incomeStatement');
  const handleCashFlowChange = createStatementHandler(setAccounting, 'cashFlow');
  const handleBalanceSheetChange = createStatementHandler(setAccounting, 'balanceSheet');

  return (
    <div className="space-y-6 pl-6 border-l-2">
      {/* Income Statement */}
      <FinancialStatementForm
        type="incomeStatement"
        title="損益表"
        icon="📊"
        fieldLabel="類別"
        categoryOptions={IncomeStatementCategoryOptions}
        subcategoryOptions={incomeStatementSubcategoryMap}
        category={data?.accounting?.incomeStatement?.category}
        subcategory={data?.accounting?.incomeStatement?.subcategory}
        order={data?.accounting?.incomeStatement?.order}
        onChanged={handleIncomeStatementChange}
      />

      {/* Cash Flow */}
      <FinancialStatementForm
        type="cashFlow"
        title="現金流量"
        icon="💰"
        fieldLabel="活動"
        categoryOptions={CashFlowCategoryOptions}
        subcategoryOptions={cashFlowSubcategoryMap}
        category={data?.accounting?.cashFlow?.category}
        subcategory={data?.accounting?.cashFlow?.subcategory}
        order={data?.accounting?.cashFlow?.order}
        onChanged={handleCashFlowChange}
      />

      {/* Balance Sheet */}
      <FinancialStatementForm
        type="balanceSheet"
        title="資產負債表"
        icon="📈"
        fieldLabel="類別"
        categoryOptions={BalanceSheetCategoryOptions}
        subcategoryOptions={balanceSheetSubcategoryMap}
        category={data?.accounting?.balanceSheet?.category}
        subcategory={data?.accounting?.balanceSheet?.subcategory}
        order={data?.accounting?.balanceSheet?.order}
        onChanged={handleBalanceSheetChange}
      />
    </div>
  );
};

export default AccountingSettings;
