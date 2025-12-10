import { useAuth } from '@/contexts/useAuth';
import type { FinancialReport } from '@/schemas/report';
import { financialReportService } from '@/services/financialReportService';
import { useState } from 'react';
import { toast } from 'sonner';

interface GeneratedReports {
  incomeStatement: FinancialReport;
  balanceSheet: FinancialReport;
  cashFlow: FinancialReport;
  reconciliation: { reconciled: boolean; difference: number };
}

export const useFinancialReportGenerator = () => {
  const { userProfile } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReports | null>(null);

  const generateReports = async () => {
    if (!userProfile?.householdId || !userProfile.uid) {
      toast.error('User profile not loaded');
      return;
    }

    setLoading(true);
    try {
      const result = await financialReportService.generateFinancialReports(
        userProfile.householdId,
        year,
        month,
        userProfile.uid,
      );
      setGeneratedReports(result);
      toast.success('Reports generated successfully');
    } catch (error) {
      console.error('Failed to generate reports:', error);
      toast.error('Failed to generate reports');
    } finally {
      setLoading(false);
    }
  };

  const saveReports = async () => {
    if (!generatedReports || !userProfile?.householdId || !userProfile.email) {
      toast.error('No reports to save');
      return;
    }

    setLoading(true);
    try {
      await financialReportService.saveFinancialReports(
        userProfile.householdId,
        [
          generatedReports.incomeStatement,
          generatedReports.balanceSheet,
          generatedReports.cashFlow,
        ],
        userProfile.email,
      );
      toast.success('Reports saved to database');
      setGeneratedReports(null);
    } catch (error) {
      console.error('Failed to save reports:', error);
      toast.error('Failed to save reports');
    } finally {
      setLoading(false);
    }
  };

  const cancelReports = () => {
    setGeneratedReports(null);
  };

  return {
    year,
    month,
    loading,
    generatedReports,
    setYear,
    setMonth,
    generateReports,
    saveReports,
    cancelReports,
  };
};
