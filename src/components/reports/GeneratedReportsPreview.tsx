import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  mapToBalanceSheetView,
  mapToCashFlowView,
  mapToIncomeStatementView,
} from '@/domains/finance/mappers/reportToView';
import type { FinancialReport } from '@/schemas/report';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import React from 'react';

import BalanceSheetView from './BalanceSheetView';
import CashFlowView from './CashFlowView';
import IncomeStatementView from './IncomeStatementView';

interface GeneratedReportsPreviewProps {
  generatedReports: {
    incomeStatement: FinancialReport;
    balanceSheet: FinancialReport;
    cashFlow: FinancialReport;
    reconciliation: { reconciled: boolean; difference: number };
  };
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const GeneratedReportsPreview: React.FC<GeneratedReportsPreviewProps> = ({
  generatedReports,
  loading,
  onSave,
  onCancel,
}) => {
  return (
    <div className="space-y-6">
      {/* Reconciliation Alert */}
      {!generatedReports.reconciliation.reconciled ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reconciliation Failed</AlertTitle>
          <AlertDescription>
            There is a discrepancy of {generatedReports.reconciliation.difference.toFixed(2)}{' '}
            between Balance Sheet Cash and Cash Flow Ending Balance.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Reconciliation Successful</AlertTitle>
          <AlertDescription>Balance Sheet and Cash Flow Statement are consistent.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          {(() => {
            const viewProps = mapToIncomeStatementView(generatedReports.incomeStatement);
            return viewProps ? <IncomeStatementView statement={viewProps} /> : null;
          })()}
        </TabsContent>
        <TabsContent value="balance">
          {(() => {
            const viewProps = mapToBalanceSheetView(generatedReports.balanceSheet);
            return viewProps ? <BalanceSheetView balanceSheet={viewProps} /> : null;
          })()}
        </TabsContent>
        <TabsContent value="cashflow">
          {(() => {
            const viewProps = mapToCashFlowView(generatedReports.cashFlow);
            return viewProps ? <CashFlowView cashFlow={viewProps} /> : null;
          })()}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm & Save Reports
        </Button>
      </div>
    </div>
  );
};

export default GeneratedReportsPreview;
