import React from 'react';

import { Loader2 } from 'lucide-react';

import GeneratedReportsPreview from '@/components/reports/GeneratedReportsPreview';
import { useFinancialReportGenerator } from '@/components/reports/useFinancialReportGenerator';
import { YearMonthPicker } from '@/components/shared/YearMonthPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FinancialReportGenerator: React.FC = () => {
  const {
    year,
    month,
    loading,
    generatedReports,
    setYear,
    setMonth,
    generateReports,
    saveReports,
    cancelReports,
  } = useFinancialReportGenerator();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>選取月份</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <YearMonthPicker
              year={year}
              month={month}
              onYearChange={(y) => setYear(parseInt(y) || 0)}
              onMonthChange={(m) => setMonth(parseInt(m) || 1)}
              className="flex gap-4"
            />
            <Button onClick={generateReports} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedReports && (
        <GeneratedReportsPreview
          generatedReports={generatedReports}
          loading={loading}
          onSave={saveReports}
          onCancel={cancelReports}
        />
      )}
    </div>
  );
};

export default FinancialReportGenerator;
