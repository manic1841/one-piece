import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, Wallet, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import FinancialReportGenerator from '@/components/reports/FinancialReportGenerator';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const reports = [
    {
      id: 'income-statement',
      title: '損益表',
      description: '查看收入與支出明細',
      icon: FileText,
      path: '/reports/income-statement',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      enabled: true,
    },
    {
      id: 'balance-sheet',
      title: '資產負債表',
      description: '查看財務狀況',
      icon: Wallet,
      path: '/reports/balance-sheet',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      enabled: true,
    },
    {
      id: 'cash-flow',
      title: '現金流量表',
      description: '查看現金流動',
      icon: TrendingUp,
      path: '/reports/cash-flow',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      enabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">財務報表</h2>
          <p className="text-muted-foreground">
            查看您的財務狀況和收支情況
          </p>
        </div>
        <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
          <DialogTrigger asChild>
            <div className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>產生月結報表</span>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>產生月結報表</DialogTitle>
            <FinancialReportGenerator />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${report.enabled ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
              }`}
            onClick={() => report.enabled && navigate(report.path)}
          >
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-2`}>
                <report.icon className={`h-6 w-6 ${report.color}`} />
              </div>
              <CardTitle className="flex items-center justify-between">
                {report.title}
                {!report.enabled && (
                  <span className="text-xs font-normal text-muted-foreground">(即將推出)</span>
                )}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            {report.enabled && (
              <CardContent>
                <p className="text-sm text-blue-600 font-medium">點擊查看 →</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
