import React from 'react';

import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ExpenseSubCategoryLabel,
  IncomeStatementCategoryLabel,
  IncomeStatementReportLabel,
  IncomeSubCategoryLabel,
  ReportCommonLabel,
} from '@/constants/finance/financeLabel';
import type { IncomeStatementView as IncomeStatementViewData } from '@/domains/finance/mappers';
import { IncomeStatementCategory } from '@/domains/finance/types/categories';
import { formatDateRange } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface IncomeStatementViewProps {
  statement: IncomeStatementViewData;
  onCategoryClick?: (category: string) => void;
}

const IncomeStatementView: React.FC<IncomeStatementViewProps> = ({
  statement,
  onCategoryClick,
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (
    categoryGroup: IncomeStatementViewData['income']['categories'][number],
    type: 'income' | 'expense',
  ) => {
    const isExpanded = expandedCategories.has(categoryGroup.category);
    const hasItems = categoryGroup.items.length > 0;

    const labelMap = type === 'income' ? IncomeSubCategoryLabel : ExpenseSubCategoryLabel;
    const localizedCategory =
      (labelMap as Record<string, string>)[categoryGroup.category] || categoryGroup.category;

    return (
      <React.Fragment key={categoryGroup.category}>
        <TableRow
          className={`cursor-pointer hover:bg-slate-50 ${type === 'income' ? 'bg-green-50/30' : 'bg-red-50/30'}`}
          onClick={() => hasItems && toggleCategory(categoryGroup.category)}
        >
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              {hasItems && (
                <span className="text-slate-400">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              )}
              {localizedCategory}
            </div>
          </TableCell>
          <TableCell className="text-right font-semibold">
            {formatCurrency(categoryGroup.subtotal)}
          </TableCell>
        </TableRow>

        {/* Show items if expanded */}
        {isExpanded &&
          categoryGroup.items.map((item) => (
            <TableRow
              key={item.id}
              className="bg-slate-50/50 text-slate-600 text-sm"
              onClick={() => onCategoryClick?.(item.category)}
            >
              <TableCell className="pl-12">
                {item.subcategory || ReportCommonLabel.DETAILS}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
            </TableRow>
          ))}
      </React.Fragment>
    );
  };

  const startDate = statement.startDate;
  const endDate = statement.endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{IncomeStatementReportLabel.TITLE}</h2>
        <p className="text-sm text-muted-foreground mt-1">{formatDateRange(startDate, endDate)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {IncomeStatementReportLabel.INCOME_TOTAL}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statement.income.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {IncomeStatementReportLabel.EXPENSE_TOTAL}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(statement.expense.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {IncomeStatementReportLabel.NET_INCOME}
            </CardTitle>
            {statement.netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {statement.netIncome >= 0 ? '+' : ''}
              {formatCurrency(statement.netIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Income Statement */}
      <Card>
        <CardHeader>
          <CardTitle>{ReportCommonLabel.DETAILS}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ReportCommonLabel.SUBJECT}</TableHead>
                <TableHead className="text-right">{ReportCommonLabel.AMOUNT}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Income Section */}
              <TableRow className="bg-green-50 font-black text-green-900 hover:bg-green-50">
                <TableCell>
                  {IncomeStatementCategoryLabel[IncomeStatementCategory.INCOME]}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(statement.income.total)}
                </TableCell>
              </TableRow>
              {statement.income.categories.map((cat) => renderCategory(cat, 'income'))}

              {/* Spacer */}
              <TableRow className="h-4">
                <TableCell colSpan={2}></TableCell>
              </TableRow>

              {/* Expense Section */}
              <TableRow className="bg-red-50 font-black text-red-900 hover:bg-red-50">
                <TableCell>
                  {IncomeStatementCategoryLabel[IncomeStatementCategory.EXPENSE]}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(statement.expense.total)}
                </TableCell>
              </TableRow>
              {statement.expense.categories.map((cat) => renderCategory(cat, 'expense'))}

              {/* Net Income */}
              <TableRow className="h-4">
                <TableCell colSpan={2}></TableCell>
              </TableRow>
              <TableRow className={`border-t-2 border-slate-300 font-bold bg-slate-50`}>
                <TableCell className="text-lg">
                  {IncomeStatementReportLabel.NET_INCOME_SUMMARY}
                </TableCell>
                <TableCell
                  className={`text-right text-lg ${statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {statement.netIncome >= 0 ? '+' : ''}
                  {formatCurrency(statement.netIncome)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeStatementView;
