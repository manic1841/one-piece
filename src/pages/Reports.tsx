import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, Wallet } from 'lucide-react';

const Reports: React.FC = () => {
  const navigate = useNavigate();

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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">財務報表</h2>
        <p className="text-muted-foreground">
          查看您的財務狀況和收支情況
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card
            key={report.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              report.enabled ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
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
