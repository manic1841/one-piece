import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PeriodSelector from '../components/reports/PeriodSelector';
import IncomeStatementView from '../components/reports/IncomeStatementView';
import type { IncomeStatement } from '../schemas';
import { incomeStatementService } from '../services/incomeStatementService';
import { useAuth } from '../contexts/useAuth';

const IncomeStatementPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentStartDate, setCurrentStartDate] = useState<Date | null>(null);
  const [currentEndDate, setCurrentEndDate] = useState<Date | null>(null);

  const householdId = userProfile?.householdId;
  const userEmail = currentUser?.email;

  const loadStatement = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!householdId || !userEmail) return;

      setLoading(true);
      setError(null);

      try {
        const stmt = await incomeStatementService.generateIncomeStatement(
          householdId,
          startDate,
          endDate,
          userEmail,
        );
        setStatement(stmt);
      } catch (err) {
        console.error('Failed to generate income statement:', err);
        setError('無法生成損益表，請稍後再試。');
      } finally {
        setLoading(false);
      }
    },
    [householdId, userEmail],
  );

  const handlePeriodChange = useCallback((startDate: Date, endDate: Date) => {
    setCurrentStartDate(startDate);
    setCurrentEndDate(endDate);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!currentStartDate || !currentEndDate) return;
    loadStatement(currentStartDate, currentEndDate);
  }, [currentStartDate, currentEndDate, loadStatement]);

  if (!householdId || !userEmail) {
    return <div>Loading...</div>;
  }

  if (loading && !statement) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">正在生成報表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/reports')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button className="mt-4" onClick={handleGenerate}>
              重試
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回報表
          </Button>
          <h1 className="text-3xl font-bold">損益表</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/settings/accounting-config')}>
          <Settings className="mr-2 h-4 w-4" />
          會計科目設定
        </Button>
      </div>

      {/* Control Panel */}
      <div className="grid gap-6 border rounded-lg p-6 bg-card">
        {/* Period Selector */}
        <div>
          <h3 className="text-lg font-semibold mb-3">選擇期間</h3>
          <PeriodSelector onChange={handlePeriodChange} />
        </div>

        {/* Generate Button */}
        <div>
          <Button
            onClick={handleGenerate}
            disabled={!currentStartDate || !currentEndDate || loading}
            className="w-full"
          >
            {loading ? '生成中...' : '生成損益表'}
          </Button>
        </div>
      </div>

      {/* Income Statement View */}
      {statement && <IncomeStatementView statement={statement} />}

      {!statement && !loading && (
        <div className="text-center text-muted-foreground py-12">
          請選擇期間，然後點擊「生成損益表」
        </div>
      )}
    </div>
  );
};

export default IncomeStatementPage;
