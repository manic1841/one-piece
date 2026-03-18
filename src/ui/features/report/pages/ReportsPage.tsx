import React, { useState } from 'react';

import { ChevronRight, FileText, TrendingUp, Wallet } from 'lucide-react';

import { useAuth } from '@/infra/contexts/useAuth';
import { Card, CardContent } from '@/ui/components/ui/card';

import BalanceSheetPage from './BalanceSheet';
import CashFlowStatementPage from './CashFlowStatement';
import IncomeStatementPage from './IncomeStatement';

type ReportView = 'MENU' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';

const Reports: React.FC = () => {
  const { userProfile } = useAuth();
  const [view, setView] = useState<ReportView>('MENU');

  const householdId = userProfile?.householdId || '';

  if (!householdId) {
    return <div className="p-8 text-center">Please select a household first.</div>;
  }

  if (view === 'INCOME_STATEMENT') {
    return <IncomeStatementPage householdId={householdId} onBack={() => setView('MENU')} />;
  }

  if (view === 'BALANCE_SHEET') {
    return <BalanceSheetPage householdId={householdId} onBack={() => setView('MENU')} />;
  }

  if (view === 'CASH_FLOW') {
    return <CashFlowStatementPage householdId={householdId} onBack={() => setView('MENU')} />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">財務報表</h1>
        <p className="text-gray-500 mt-2">檢視您的損益狀況與資產分佈</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden border-emerald-100"
          onClick={() => setView('INCOME_STATEMENT')}
        >
          <CardContent className="p-0">
            <div className="bg-emerald-500 p-6 flex justify-between items-center text-white">
              <FileText size={32} />
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">損益表</h3>
              <p className="text-gray-500 mt-2">
                追蹤特定期間內的收入與支出，了解您的現金流入與流出狀況。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden border-blue-100"
          onClick={() => setView('BALANCE_SHEET')}
        >
          <CardContent className="p-0">
            <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
              <Wallet size={32} />
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">資產負債表</h3>
              <p className="text-gray-500 mt-2">
                檢視特定時間點的資產、負債與淨資產，掌握您的整體財務存量。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all group overflow-hidden border-purple-100"
          onClick={() => setView('CASH_FLOW')}
        >
          <CardContent className="p-0">
            <div className="bg-purple-600 p-6 flex justify-between items-center text-white">
              <TrendingUp size={32} />
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">現金流量表</h3>
              <p className="text-gray-500 mt-2">
                追蹤特定期間內的現金流入與流出，分為營業、投資與融資活動。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
