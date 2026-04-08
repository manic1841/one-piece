import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { budgetService } from '../services/budgetService';
import { projectService } from '../services/projectService';
import { type Project, type MonthlyBudgetStats, type MonthlyCategoryStat } from '../schemas';
import { formatCurrency } from '../utils/formatUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<MonthlyBudgetStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  useEffect(() => {
    if (userProfile?.householdId) {
      const loadData = async () => {
        if (!userProfile?.householdId) return;

        setLoading(true);
        try {
          const [statsData, projectsData] = await Promise.all([
            budgetService.getMonthlyStats(userProfile.householdId, currentYear, currentMonth),
            projectService.getProjects(userProfile.householdId),
          ]);
          setStats(statsData);
          setProjects(projectsData);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [userProfile?.householdId, currentMonth, currentYear]);

  const getProjectInfo = (projectId: string) => {
    return (
      projects.find((p) => p.id === projectId) || {
        name: 'Unknown Project',
        icon: '📦',
        color: 'bg-gray-100 text-gray-600',
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalAllocated =
    stats?.stats.reduce((sum: number, s: MonthlyCategoryStat) => sum + s.allocated, 0) || 0;
  const totalSpent =
    stats?.stats.reduce((sum: number, s: MonthlyCategoryStat) => sum + s.spent, 0) || 0;
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {currentYear}年{currentMonth}月 Budget Overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalIncome || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAllocated > 0
                ? `${((totalSpent / totalAllocated) * 100).toFixed(1)}% of budget`
                : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(totalRemaining)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Budget by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {stats?.stats.map((stat: MonthlyCategoryStat) => {
            const project = getProjectInfo(stat.category);
            const percentageUsed = stat.percentageUsed;
            const isOverBudget = stat.isOverBudget;

            return (
              <div key={stat.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 flex items-center justify-center rounded-lg ${project.color}`}
                    >
                      {project.icon}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.percentage.toFixed(1)}% of income
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}
                    >
                      {formatCurrency(stat.spent)} / {formatCurrency(stat.allocated)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isOverBudget
                        ? `+${formatCurrency(Math.abs(stat.remaining))} over`
                        : `${formatCurrency(stat.remaining)} left`}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress
                  value={Math.min(percentageUsed, 100)}
                  className={`h-2 ${
                    isOverBudget
                      ? '[&>div]:bg-red-500'
                      : percentageUsed > 80
                        ? '[&>div]:bg-yellow-500'
                        : '[&>div]:bg-green-500'
                  }`}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {percentageUsed.toFixed(1)}% used
                </p>
              </div>
            );
          })}

          {(!stats || stats.stats.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              No budget data available. Add some income and expenses to see your budget overview.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
