import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CashFlowView as CashFlowViewData } from '@/domains/finance/mappers/reportToView';
import { formatCurrency } from '@/utils/formatUtils';

interface CashFlowViewProps {
  cashFlow: CashFlowViewData;
}

const CashFlowView: React.FC<CashFlowViewProps> = ({ cashFlow }) => {
  const renderSection = (
    title: string,
    section: {
      netAmount: number;
      items: Array<{ id: string; name: string; amount: number }>;
    },
  ) => (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-3 flex justify-between items-center">
        <span>{title}</span>
        <span className={`font-mono ${section.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(section.netAmount)}
        </span>
      </h4>
      <div className="space-y-2 pl-4 border-l-2 border-gray-100">
        {section.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">無相關活動</p>
        ) : (
          section.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span className={`font-mono ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💸</span>
            <span>現金流量表</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderSection('營業活動現金流', cashFlow.operating)}
          {renderSection('投資活動現金流', cashFlow.investing)}
          {renderSection('融資活動現金流', cashFlow.financing)}

          <div className="mt-8 pt-4 border-t-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">現金淨增減</span>
              <span
                className={`font-bold font-mono text-lg ${
                  cashFlow.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(cashFlow.netChange)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>期初現金 (估計)</span>
              <span className="font-mono">{formatCurrency(cashFlow.beginningBalance)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-medium mt-1">
              <span>期末現金 (估計)</span>
              <span className="font-mono">{formatCurrency(cashFlow.endingBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowView;
