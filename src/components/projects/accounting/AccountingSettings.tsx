import React, { useState, useEffect } from 'react';
import IncomeStatementForm from './IncomeStatementForm';
import CashFlowForm from './cashFlowForm';
import BalanceSheetForm from './balanceSheetForm';
import { type Project } from '@/schemas/project';
import { IncomeStatementCategory } from '@/domains/finance/finaceCategory';
import { CashFlowCategory } from '@/domains/finance/finaceCategory';
import { BalanceSheetCategory } from '@/domains/finance/finaceCategory';

interface AccountingSettingsProps {
  data: Partial<Project> | null;
  onChanged: (data: Partial<Project>) => void;
}

const AccountingSettings: React.FC<AccountingSettingsProps> = ({ data, onChanged }) => {
  const [accounting, setAccounting] = useState(data?.accounting || { enabled: false });

  useEffect(() => {
    onChanged({
      accounting,
    });
  }, [accounting, onChanged]);

  const handleIncomeStatementChange = (incomeData: {
    category?: IncomeStatementCategory;
    order?: number;
  }) => {
    setAccounting((prev) => ({
      ...prev,
      incomeStatement: {
        category: incomeData.category as IncomeStatementCategory,
        order: incomeData.order,
      },
    }));
  };

  const handleCashFlowChange = (cashFlowData: { category?: CashFlowCategory; order?: number }) => {
    setAccounting((prev) => ({
      ...prev,
      cashFlow: {
        category: cashFlowData.category as CashFlowCategory,
        order: cashFlowData.order,
      },
    }));
  };

  const handleBalanceSheetChange = (balanceSheetData: {
    category?: BalanceSheetCategory;
    order?: number;
  }) => {
    setAccounting((prev) => ({
      ...prev,
      balanceSheet: {
        category: balanceSheetData.category as BalanceSheetCategory,
        order: balanceSheetData.order,
      },
    }));
  };

  return (
    <div className="space-y-6 pl-6 border-l-2">
      {/* Income Statement */}
      <IncomeStatementForm
        category={data?.accounting?.incomeStatement?.category}
        order={data?.accounting?.incomeStatement?.order}
        onChanged={handleIncomeStatementChange}
      />

      {/* Cash Flow */}
      <CashFlowForm
        category={data?.accounting?.cashFlow?.category}
        order={data?.accounting?.cashFlow?.order}
        onChanged={handleCashFlowChange}
      />

      {/* Balance Sheet */}
      <BalanceSheetForm
        category={data?.accounting?.balanceSheet?.category}
        order={data?.accounting?.balanceSheet?.order}
        onChanged={handleBalanceSheetChange}
      />
    </div>
  );
};

export default AccountingSettings;
