import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import PeriodSelector from '../components/reports/PeriodSelector';
import BalanceSheetView from '../components/reports/BalanceSheetView';
import { balanceSheetService } from '../services/balanceSheetService';
import { useAuth } from '../contexts/useAuth';
import type { BalanceSheet } from '../schemas/balanceSheet';

export default function BalanceSheetPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for period
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  useEffect(() => {
    loadBalanceSheet();
  }, [asOfDate, userProfile?.householdId]);

  const loadBalanceSheet = async () => {
    if (!userProfile?.householdId || !userProfile.email) return;

    setLoading(true);
    setError(null);

    try {
      const data = await balanceSheetService.generateBalanceSheet(
        userProfile.householdId,
        asOfDate,
        userProfile.email,
      );
      
      setBalanceSheet(data);
    } catch (err) {
      console.error('Failed to load balance sheet:', err);
      setError('無法載入資產負債表');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = useCallback((_start: Date, end: Date) => {
    setAsOfDate(end);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reports')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">資產負債表</h1>
            <p className="text-muted-foreground">
              截至 {asOfDate.getFullYear()}/{String(asOfDate.getMonth() + 1).padStart(2, '0')}/
              {asOfDate.getDate()}
            </p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        onChange={handlePeriodChange}
      />

      {/* Content */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">載入中...</div>
        </div>
      )}

      {error && (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      {!loading && !error && balanceSheet && (
        <BalanceSheetView balanceSheet={balanceSheet} />
      )}

      {!loading && !error && !balanceSheet && (
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">無資料</div>
        </div>
      )}
    </div>
  );
}
