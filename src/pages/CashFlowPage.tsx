import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import PeriodSelector from '../components/reports/PeriodSelector';
import CashFlowView from '../components/reports/CashFlowView';
import { cashFlowService } from '../services/cashFlowService';
import { useAuth } from '../contexts/useAuth';
import type { CashFlowStatement } from '../schemas/cashFlow';

export default function CashFlowPage() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for period
  const [period, setPeriod] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(),
  });

  useEffect(() => {
    loadCashFlow();
  }, [period.start, period.end, userProfile?.householdId]);

  const loadCashFlow = async () => {
    if (!userProfile?.householdId || !userProfile.email) return;

    setLoading(true);
    setError(null);

    try {
      const data = await cashFlowService.generateCashFlowStatement(
        userProfile.householdId,
        period.start,
        period.end,
        userProfile.email,
      );

      setCashFlow(data);
    } catch (err) {
      console.error('Failed to load cash flow statement:', err);
      setError('無法載入現金流量表');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = useCallback((start: Date, end: Date) => {
    setPeriod({ start, end });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">現金流量表</h1>
            <p className="text-muted-foreground">
              {period.start.toLocaleDateString()} - {period.end.toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <PeriodSelector onChange={handlePeriodChange} />

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

      {!loading && !error && cashFlow && <CashFlowView cashFlow={cashFlow} />}

      {!loading && !error && !cashFlow && (
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">無資料</div>
        </div>
      )}
    </div>
  );
}
