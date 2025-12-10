import GeneratedReportsPreview from '@/components/reports/GeneratedReportsPreview';
import { useFinancialReportGenerator } from '@/components/reports/useFinancialReportGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import React from 'react';

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
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[year - 1, year, year + 1].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
