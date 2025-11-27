import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { budgetService } from '../services/budgetService';
import { projectService } from '../services/projectService';
import { type Project, type MonthlyBudgetStats, type MonthlyCategoryStat } from '../schemas';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-gray-500">Loading...</div>
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          {currentYear}年{currentMonth}月 Budget Overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Monthly Income</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(stats?.totalIncome || 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalAllocated > 0
              ? `${((totalSpent / totalAllocated) * 100).toFixed(1)}% of budget`
              : '0%'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Remaining</h3>
          <p
            className={`text-2xl font-bold mt-2 ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Budget by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Budget by Category</h2>
        <div className="space-y-6">
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
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">
                        {stat.percentage.toFixed(1)}% of income
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}
                    >
                      {formatCurrency(stat.spent)} / {formatCurrency(stat.allocated)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isOverBudget
                        ? `+${formatCurrency(Math.abs(stat.remaining))} over`
                        : `${formatCurrency(stat.remaining)} left`}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget
                        ? 'bg-red-500'
                        : percentageUsed > 80
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  {percentageUsed.toFixed(1)}% used
                </p>
              </div>
            );
          })}
        </div>

        {(!stats || stats.stats.length === 0) && (
          <p className="text-gray-500 text-center py-8">
            No budget data available. Add some income and expenses to see your budget overview.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
