import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  reconciliationService,
  type ReconciliationReport,
} from '../services/reconciliationService';
import { projectService } from '../services/projectService';
import { type Project } from '../schemas';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Reconciliation: React.FC = () => {
  const { userProfile } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.householdId) return;

    let mounted = true;

    const loadData = async () => {
      if (!userProfile?.householdId) return;

      try {
        setLoading(true);

        const [reportData, projectsData] = await Promise.all([
          reconciliationService.getReconciliationReport(
            userProfile.householdId,
            selectedYear,
            selectedMonth,
          ),
          projectService.getProjects(userProfile.householdId),
        ]);

        if (mounted) {
          setReport(reportData);
          setProjects(projectsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [userProfile, selectedYear, selectedMonth]);

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || projectId;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Reconciliation</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reconciliation</h1>
        <p className="text-muted-foreground mt-2">比較實際餘額變化與專案快照預期</p>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft size={20} />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {selectedYear}年 {selectedMonth}月
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Discrepancy Alert */}
          {report.hasDiscrepancy ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-900">發現差異</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  實際餘額變化與專案快照預期不符，差異金額：
                  <span className="font-bold ml-1">
                    {formatCurrency(Math.abs(report.discrepancy))}
                  </span>
                  {report.discrepancy > 0 ? ' (多出)' : ' (短少)'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-green-900">對帳成功</h3>
                <p className="text-sm text-green-800 mt-1">實際餘額變化與專案快照預期完全一致</p>
              </div>
            </div>
          )}

          {/* Actual Balance Section */}
          <Card>
            <CardHeader>
              <CardTitle>實際餘額</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">上月總餘額</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatCurrency(report.previousMonth.totalBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.previousMonth.year}/{report.previousMonth.month}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">本月總餘額</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {formatCurrency(report.currentMonth.totalBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.currentMonth.year}/{report.currentMonth.month}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">實際變化</p>
                  <p
                    className={`text-xl font-bold mt-1 ${report.actualChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                  >
                    {report.actualChange >= 0 ? '+' : ''}
                    {formatCurrency(report.actualChange)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Summary */}
          <Card>
            <CardHeader>
              <CardTitle>專案統計（來自快照）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Income */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">收入明細</h4>
                  <div className="space-y-2">
                    {Object.entries(report.expected.incomeByProject).map(([projectId, amount]) => (
                      <div key={projectId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{getProjectName(projectId)}</span>
                        <span className="font-medium text-green-600">
                          +{formatCurrency(amount as number)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border flex justify-between font-semibold">
                      <span>總收入</span>
                      <span className="text-green-600">
                        +{formatCurrency(report.expected.totalIncome)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">支出明細</h4>
                  <div className="space-y-2">
                    {Object.entries(report.expected.expenseByProject).map(([projectId, amount]) => (
                      <div key={projectId} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{getProjectName(projectId)}</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(amount as number)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border flex justify-between font-semibold">
                      <span>總支出</span>
                      <span className="text-red-600">
                        -{formatCurrency(report.expected.totalExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expected Change */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">預期變化（來自專案快照）</span>
                  <span
                    className={`text-xl font-bold ${report.expectedChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                  >
                    {report.expectedChange >= 0 ? '+' : ''}
                    {formatCurrency(report.expectedChange)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Result */}
          <Card>
            <CardHeader>
              <CardTitle>對帳結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">實際變化</span>
                  <span className="font-medium">{formatCurrency(report.actualChange)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">預期變化</span>
                  <span className="font-medium">{formatCurrency(report.expectedChange)}</span>
                </div>
                <div className="pt-3 border-t-2 border-border flex justify-between items-center">
                  <span className="font-semibold text-foreground">差異</span>
                  <span
                    className={`text-2xl font-bold ${Math.abs(report.discrepancy) < 0.01 ? 'text-green-600' : 'text-yellow-600'
                      }`}
                  >
                    {Math.abs(report.discrepancy) < 0.01
                      ? '✓ 完全一致'
                      : formatCurrency(report.discrepancy)}
                  </span>
                </div>
                {report.hasDiscrepancy && (
                  <p className="text-sm text-muted-foreground mt-2">
                    💡 提示：差異可能來自未記錄的專案快照、手續費、或餘額記錄錯誤。
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              沒有找到 {selectedYear}年{selectedMonth}月 的對帳資料
            </p>
            <p className="text-sm text-muted-foreground mt-2">請先在 Assets 頁面記錄本月和上月的帳戶餘額</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reconciliation;
