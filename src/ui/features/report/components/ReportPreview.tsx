import React from 'react';

import { FileText, TrendingUp, Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import {
  type BalanceSheetVM,
  type CashFlowVM,
  type IncomeStatementVM,
} from '@/ui/features/report/viewmodels/reportDisplay.vm';

interface ReportPreviewProps {
  data: {
    incomeStatement: IncomeStatementVM;
    balanceSheet: BalanceSheetVM;
    cashFlow: CashFlowVM;
  };
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ data }) => {
  const { incomeStatement, balanceSheet, cashFlow } = data;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6 bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger
            value="income"
            className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <FileText size={16} className="mr-2" /> 損益表
          </TabsTrigger>
          <TabsTrigger
            value="balance"
            className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <Wallet size={16} className="mr-2" /> 資產負債表
          </TabsTrigger>
          <TabsTrigger
            value="cashflow"
            className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <TrendingUp size={16} className="mr-2" /> 現金流量表
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">總收入</p>
              <p className="text-xl font-black text-emerald-700">
                {incomeStatement.incomeTotalText}
              </p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
              <p className="text-xs font-bold text-rose-600 uppercase mb-1">總支出</p>
              <p className="text-xl font-black text-rose-700">{incomeStatement.expenseTotalText}</p>
            </div>
          </div>
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="py-4 bg-slate-50/50">
              <CardTitle className="text-sm font-bold">
                預計淨損益: {incomeStatement.netIncomeText}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {incomeStatement.incomeItems.map((item) => (
                  <div key={item.code} className="flex justify-between p-3 px-6 text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono text-emerald-600">+{item.amountText}</span>
                  </div>
                ))}
                {incomeStatement.expenseItems.map((item) => (
                  <div key={item.code} className="flex justify-between p-3 px-6 text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono text-rose-600">-{item.amountText}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-blue-600 mb-1">資產</p>
              <p className="text-lg font-black text-blue-700">{balanceSheet.assets.totalText}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
              <p className="text-xs font-bold text-rose-600 mb-1">負債</p>
              <p className="text-lg font-black text-rose-700">
                {balanceSheet.liabilities.totalText}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 mb-1">淨值</p>
              <p className="text-lg font-black text-white">{balanceSheet.equity.totalText}</p>
            </div>
          </div>
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                    主要資產
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.assets.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-slate-50/50 rounded-xl text-sm"
                      >
                        <span className="font-bold text-slate-700">{group.label}</span>
                        <span className="font-mono">{group.totalText}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                    主要負債
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.liabilities.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-slate-50/50 rounded-xl text-sm"
                      >
                        <span className="font-bold text-slate-700">{group.label}</span>
                        <span className="font-mono">{group.totalText}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">
                    權益
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.equity.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-indigo-50/30 rounded-xl text-sm"
                      >
                        <span className="font-bold text-slate-700">{group.label}</span>
                        <span
                          className={`font-mono ${group.total >= 0 ? 'text-slate-700' : 'text-rose-600'}`}
                        >
                          {group.totalText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-1">期初餘額</p>
              <p className="text-lg font-black text-slate-700">{cashFlow.beginningBalanceText}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 mb-1">期末餘額</p>
              <p className="text-lg font-black text-indigo-700">{cashFlow.endingBalanceText}</p>
            </div>
          </div>
          <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="py-4 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-indigo-700">
                現金變動淨額: {cashFlow.netCashChangeText}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
              {(['operating', 'investing', 'financing'] as const).map((id) => {
                const group = cashFlow[id];
                if (!group) return null;
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex justify-between px-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">{group.label}</span>
                      <span className="text-xs font-mono font-bold">{group.totalText}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${group.total >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: '100%' }} // Simple bar for preview
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 items-start">
        <TrendingUp className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          這是根據當前系統快照預算的數據。點選「正式發佈」後，這些數據將會被鎖定並儲存為正式報表。
        </p>
      </div>
    </div>
  );
};
