import BalanceSheetForm from '@/components/projects/form/BalanceSheetForm';
import CashFlowForm from '@/components/projects/form/CashFlowForm';
import IncomeStatementForm from '@/components/projects/form/IncomeStatementForm';
import type { ProjectFormData } from '@/domains/project/types/projectForm';
import { useEffect, useState } from 'react';

interface AccountingSettingsProps {
  data?: ProjectFormData;
  onChanged: (data: Partial<ProjectFormData>) => void;
}

const AccountingSettings: React.FC<AccountingSettingsProps> = ({ data, onChanged }) => {
  console.log('AccountingSettings data:', data);
  const [accounting, setAccounting] = useState(data?.accounting || { enabled: false });
  console.log('AccountingSettings accounting state:', accounting);

  useEffect(() => {
    onChanged({
      accounting,
    });
  }, [accounting, onChanged]);

  const handleIncomeStatementChange = (incomeData: { category: string; order?: number }) => {
    setAccounting((prev) => ({
      ...prev,
      incomeStatement: {
        category: incomeData.category,
        order: incomeData.order,
      },
    }));
  };

  const handleCashFlowChange = (cashFlowData: { category: string; order?: number }) => {
    setAccounting((prev) => ({
      ...prev,
      cashFlow: {
        category: cashFlowData.category,
        order: cashFlowData.order,
      },
    }));
  };

  const handleBalanceSheetChange = (balanceSheetData: { category: string; order?: number }) => {
    setAccounting((prev) => ({
      ...prev,
      balanceSheet: {
        category: balanceSheetData.category,
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
