import React from 'react';

import { FileText, TrendingUp, Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
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
        <TabsList className="grid grid-cols-3 mb-6 bg-muted p-1 rounded-2xl">
          <TabsTrigger
            value="income"
            className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <FileText size={16} className="mr-2" /> {REPORT_VIEW_TITLES.INCOME_STATEMENT}
          </TabsTrigger>
          <TabsTrigger
            value="balance"
            className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Wallet size={16} className="mr-2" /> {REPORT_VIEW_TITLES.BALANCE_SHEET}
          </TabsTrigger>
          <TabsTrigger
            value="cashflow"
            className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <TrendingUp size={16} className="mr-2" /> {REPORT_VIEW_TITLES.CASH_FLOW}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-positive/10 p-4 rounded-2xl border border-positive/20">
              <p className="text-xs font-bold text-positive uppercase mb-1">總收入</p>
              <p className="text-xl font-black text-positive">
                {incomeStatement.incomeTotalText}
              </p>
            </div>
            <div className="bg-negative/10 p-4 rounded-2xl border border-negative/20">
              <p className="text-xs font-bold text-negative uppercase mb-1">總支出</p>
              <p className="text-xl font-black text-negative">{incomeStatement.expenseTotalText}</p>
            </div>
          </div>
          <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
            <CardHeader className="py-4 bg-muted/50">
              <CardTitle className="text-sm font-bold">
                預計淨損益: {incomeStatement.netIncomeText}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <div className="divide-y divide-border">
                {incomeStatement.incomeItems.map((item) => (
                  <div key={item.code} className="flex justify-between p-3 px-6 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-positive">+{item.amountText}</span>
                  </div>
                ))}
                {incomeStatement.expenseItems.map((item) => (
                  <div key={item.code} className="flex justify-between p-3 px-6 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-negative">-{item.amountText}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <p className="text-xs font-bold text-primary mb-1">資產</p>
              <p className="text-lg font-black text-primary">{balanceSheet.assets.totalText}</p>
            </div>
            <div className="bg-negative/10 p-4 rounded-2xl border border-negative/20">
              <p className="text-xs font-bold text-negative mb-1">負債</p>
              <p className="text-lg font-black text-negative">
                {balanceSheet.liabilities.totalText}
              </p>
            </div>
            <div className="bg-primary p-4 rounded-2xl">
              <p className="text-xs font-bold text-primary-foreground/70 mb-1">淨值</p>
              <p className="text-lg font-black text-primary-foreground">
                {balanceSheet.equity.totalText}
              </p>
            </div>
          </div>
          <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-2">
                    主要資產
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.assets.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-muted/50 rounded-xl text-sm"
                      >
                        <span className="font-bold text-foreground">{group.label}</span>
                        <span className="font-mono">{group.totalText}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-2">
                    主要負債
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.liabilities.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-muted/50 rounded-xl text-sm"
                      >
                        <span className="font-bold text-foreground">{group.label}</span>
                        <span
                          className={`font-mono ${group.total >= 0 ? 'text-foreground' : 'text-negative'}`}
                        >
                          {group.totalText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 px-2">
                    權益
                  </h4>
                  <div className="space-y-1">
                    {Object.values(balanceSheet.equity.groups).map((group) => (
                      <div
                        key={group.label}
                        className="flex justify-between p-2 px-4 bg-primary/5 rounded-xl text-sm"
                      >
                        <span className="font-bold text-foreground">{group.label}</span>
                        <span
                          className={`font-mono ${group.total >= 0 ? 'text-foreground' : 'text-negative'}`}
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
            <div className="bg-muted p-4 rounded-2xl border border-border">
              <p className="text-xs font-bold text-muted-foreground mb-1">期初餘額</p>
              <p className="text-lg font-black text-foreground">{cashFlow.beginningBalanceText}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <p className="text-xs font-bold text-primary mb-1">期末餘額</p>
              <p className="text-lg font-black text-primary">{cashFlow.endingBalanceText}</p>
            </div>
          </div>
          <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
            <CardHeader className="py-4 bg-muted/50">
              <CardTitle className="text-sm font-bold text-primary">
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
                      <span className="text-xs font-bold text-muted-foreground">{group.label}</span>
                      <span className="text-xs font-mono font-bold">{group.totalText}</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${group.total >= 0 ? 'bg-positive' : 'bg-negative'}`}
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
