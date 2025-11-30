import React from 'react';
import type { BalanceSheet, BalanceSheetCategory } from '../../schemas/balanceSheet';
import { formatCurrency } from '../../utils/formatUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface BalanceSheetViewProps {
  balanceSheet: BalanceSheet;
}

const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({ balanceSheet }) => {
  const renderCategory = (category: BalanceSheetCategory) => (
    <div key={category.category} className="mb-4">
      <h4 className="font-medium text-sm text-muted-foreground mb-2">{category.category}</h4>
      <div className="space-y-1 pl-4">
        {category.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span className="font-mono">{formatCurrency(item.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-medium pt-1 border-t">
          <span>小計</span>
          <span className="font-mono">{formatCurrency(category.subtotal)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Assets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💰</span>
            <span>資產</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balanceSheet.assets.current.map(renderCategory)}
          {balanceSheet.assets.investment.map(renderCategory)}
          {balanceSheet.assets.fixed.map(renderCategory)}
          
          <div className="flex justify-between font-bold text-lg pt-4 border-t-2">
            <span>資產總計</span>
            <span className="font-mono text-blue-600">
              {formatCurrency(balanceSheet.assets.total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Liabilities Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📌</span>
            <span>負債</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balanceSheet.liabilities.shortTerm.map(renderCategory)}
          {balanceSheet.liabilities.longTerm.map(renderCategory)}
          
          {balanceSheet.liabilities.total === 0 ? (
            <p className="text-muted-foreground text-sm">目前無負債</p>
          ) : (
            <div className="flex justify-between font-bold text-lg pt-4 border-t-2">
              <span>負債總計</span>
              <span className="font-mono text-red-600">
                {formatCurrency(balanceSheet.liabilities.total)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Worth Section */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>✨</span>
            <span>淨資產</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-lg">淨資產</span>
            <span className={`text-3xl font-bold font-mono ${
              balanceSheet.netWorth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(balanceSheet.netWorth)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            淨資產 = 資產總計 - 負債總計
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheetView;
