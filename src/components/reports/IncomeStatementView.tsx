import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDateRange } from '../../utils/dateUtils';
import type { IncomeStatement, CategoryGroup } from '../../schemas';

interface IncomeStatementViewProps {
  statement: IncomeStatement;
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

  const renderCategory = (categoryGroup: CategoryGroup, type: 'income' | 'expense') => {
    const isExpanded = expandedCategories.has(categoryGroup.category);
    const hasItems = categoryGroup.items.length > 0;

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
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              )}
              {categoryGroup.category}
            </div>
          </TableCell>
          <TableCell className="text-right font-semibold">
            {formatCurrency(categoryGroup.subtotal)}
          </TableCell>
        </TableRow>

        {/* Show items if expanded */}
        {isExpanded && categoryGroup.items.map((item) => (
          <TableRow
            key={item.id}
            className="bg-slate-50/50 text-slate-600 text-sm"
            onClick={() => onCategoryClick?.(item.category)}
          >
            <TableCell className="pl-12">{item.subcategory || '明細'}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    );
  };

  const startDate = statement.startDate instanceof Date ? statement.startDate : statement.startDate.toDate();
  const endDate = statement.endDate instanceof Date ? statement.endDate : statement.endDate.toDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">損益表</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDateRange(startDate, endDate)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">收入總計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statement.income.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">支出總計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(statement.expense.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">本期損益</CardTitle>
            {statement.netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {statement.netIncome >= 0 ? '+' : ''}{formatCurrency(statement.netIncome)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Income Statement */}
      <Card>
        <CardHeader>
          <CardTitle>明細</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Income Section */}
              <TableRow className="bg-green-100 font-semibold">
                <TableCell colSpan={2}>【收入】</TableCell>
              </TableRow>
              {statement.income.categories.map((cat) => renderCategory(cat, 'income'))}
              <TableRow className="bg-green-200 font-bold">
                <TableCell>收入總計</TableCell>
                <TableCell className="text-right">{formatCurrency(statement.income.total)}</TableCell>
              </TableRow>

              {/* Spacer */}
              <TableRow className="h-4">
                <TableCell colSpan={2}></TableCell>
              </TableRow>

              {/* Expense Section */}
              <TableRow className="bg-red-100 font-semibold">
                <TableCell colSpan={2}>【支出】</TableCell>
              </TableRow>
              {statement.expense.categories.map((cat) => renderCategory(cat, 'expense'))}
              <TableRow className="bg-red-200 font-bold">
                <TableCell>支出總計</TableCell>
                <TableCell className="text-right">{formatCurrency(statement.expense.total)}</TableCell>
              </TableRow>

              {/* Net Income */}
              <TableRow className="h-4">
                <TableCell colSpan={2}></TableCell>
              </TableRow>
              <TableRow className={`font-bold text-lg ${statement.netIncome >= 0 ? 'bg-green-300' : 'bg-red-300'}`}>
                <TableCell>【本期損益】</TableCell>
                <TableCell className="text-right">
                  {statement.netIncome >= 0 ? '+' : ''}{formatCurrency(statement.netIncome)}
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
