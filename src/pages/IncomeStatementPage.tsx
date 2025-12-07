import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import IncomeStatementView from '../components/reports/IncomeStatementView';
import { useAuth } from '../contexts/useAuth';
import type { IncomeStatement } from '../schemas';
import { incomeStatementService } from '../services/incomeStatementService';

const IncomeStatementPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const householdId = userProfile?.householdId;
  const userEmail = currentUser?.email;

  const loadStatement = useCallback(
    async (date: Date) => {
      if (!householdId || !userEmail) return;

      setLoading(true);
      setError(null);

      try {
        // Get first and last day of the month
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

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

  // Auto-load current month on mount
  useEffect(() => {
    loadStatement(currentDate);
  }, [loadStatement, currentDate]);

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth()
    );
  };

  const formatMonthYear = (date: Date) => {
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  };

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
            <Button className="mt-4" onClick={() => loadStatement(currentDate)}>
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

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center font-medium">
            {formatMonthYear(currentDate)}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth() && (
            <Button variant="outline" onClick={handleCurrentMonth}>
              本月
            </Button>
          )}
        </div>
      </div>

      {/* Income Statement View */}
      {statement && <IncomeStatementView statement={statement} />}

      {!statement && !loading && (
        <div className="text-center text-muted-foreground py-12">無法載入損益表</div>
      )}
    </div>
  );
};

export default IncomeStatementPage;
