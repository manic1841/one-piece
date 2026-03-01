import React from 'react';

import { Activity, Banknote, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

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
  CashFlowCategoryLabel,
  CashFlowReportLabel,
  FinancingSubCategoryLabel,
  InvestingSubCategoryLabel,
  OperatingSubCategoryLabel,
  ReportCommonLabel,
} from '@/constants/finance/financeLabel';
import type { CashFlowView as CashFlowViewData } from '@/domains/finance/mappers';
import { CashFlowCategory } from '@/domains/finance/types/categories';
import { formatDateRange } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface CashFlowViewProps {
  cashFlow: CashFlowViewData;
}

const CashFlowView: React.FC<CashFlowViewProps> = ({ cashFlow }) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderSection = (
    title: string,
    section: {
      netAmount: number;
      inflow: Array<{
        category: string;
        amount: number;
        items: Array<{ name: string; amount: number }>;
      }>;
      outflow: Array<{
        category: string;
        amount: number;
        items: Array<{ name: string; amount: number }>;
      }>;
    },
    sectionKey: string,
  ) => {
    return (
      <React.Fragment key={sectionKey}>
        {/* Section Header */}
        <TableRow className="bg-slate-100 font-bold hover:bg-slate-100">
          <TableCell>{title}</TableCell>
          <TableCell className="text-right">{formatCurrency(section.netAmount)}</TableCell>
        </TableRow>

        {/* Inflows */}
        {section.inflow.length > 0 && (
          <>
            <TableRow className="bg-green-50/50 font-semibold hover:bg-green-50/50">
              <TableCell className="pl-6">{CashFlowReportLabel.INFLOW}</TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(section.inflow.reduce((sum, item) => sum + item.amount, 0))}
              </TableCell>
            </TableRow>
            {section.inflow.map((cat, idx) =>
              renderCategory(cat, `${sectionKey}-inflow-${idx}`, 'inflow'),
            )}
          </>
        )}

        {/* Outflows */}
        {section.outflow.length > 0 && (
          <>
            <TableRow className="bg-red-50/50 font-semibold hover:bg-red-50/50">
              <TableCell className="pl-6">{CashFlowReportLabel.OUTFLOW}</TableCell>
              <TableCell className="text-right text-red-600">
                {formatCurrency(section.outflow.reduce((sum, item) => sum + item.amount, 0))}
              </TableCell>
            </TableRow>
            {section.outflow.map((cat, idx) =>
              renderCategory(cat, `${sectionKey}-outflow-${idx}`, 'outflow'),
            )}
          </>
        )}

        {section.inflow.length === 0 && section.outflow.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
              {ReportCommonLabel.NO_ACTIVITY}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  const renderCategory = (
    category: {
      category: string;
      amount: number;
      items: Array<{ name: string; amount: number }>;
    },
    key: string,
    type: 'inflow' | 'outflow',
  ) => {
    const isExpanded = expandedItems.has(key);
    const hasItems = category.items.length > 0;

    const allSubLabels = {
      ...OperatingSubCategoryLabel,
      ...InvestingSubCategoryLabel,
      ...FinancingSubCategoryLabel,
    };
    const localizedCategory =
      (allSubLabels as Record<string, string>)[category.category] || category.category;

    return (
      <React.Fragment key={key}>
        <TableRow
          className="cursor-pointer hover:bg-slate-50"
          onClick={() => hasItems && toggleItem(key)}
        >
          <TableCell className="pl-10">
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
          <TableCell
            className={`text-right ${type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(category.amount)}
          </TableCell>
        </TableRow>

        {isExpanded &&
          category.items.map((item, idx) => (
            <TableRow key={`${key}-item-${idx}`} className="bg-slate-50/30 text-slate-500 text-xs">
              <TableCell className="pl-20">{item.name}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
            </TableRow>
          ))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{CashFlowReportLabel.TITLE}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDateRange(cashFlow.startDate, cashFlow.endDate)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CashFlowCategoryLabel[CashFlowCategory.OPERATING]}
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${cashFlow.operating.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(cashFlow.operating.netAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CashFlowReportLabel.NET_CHANGE}
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${cashFlow.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {cashFlow.netChange >= 0 ? '+' : ''}
              {formatCurrency(cashFlow.netChange)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CashFlowReportLabel.ENDING_BALANCE}
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashFlow.endingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>{ReportCommonLabel.DETAILS}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{CashFlowReportLabel.ITEM}</TableHead>
                <TableHead className="text-right">{ReportCommonLabel.AMOUNT}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSection(
                CashFlowCategoryLabel[CashFlowCategory.OPERATING],
                cashFlow.operating,
                'operating',
              )}
              <TableRow className="h-4">
                <TableCell colSpan={2} />
              </TableRow>
              {renderSection(
                CashFlowCategoryLabel[CashFlowCategory.INVESTING],
                cashFlow.investing,
                'investing',
              )}
              <TableRow className="h-4">
                <TableCell colSpan={2} />
              </TableRow>
              {renderSection(
                CashFlowCategoryLabel[CashFlowCategory.FINANCING],
                cashFlow.financing,
                'financing',
              )}

              {/* Summary */}
              {cashFlow.adjustments.length > 0 && (
                <>
                  <TableRow className="h-8">
                    <TableCell colSpan={2} />
                  </TableRow>
                  <TableRow className="bg-slate-50 font-semibold text-slate-700">
                    <TableCell colSpan={2}>{ReportCommonLabel.ADJUSTMENTS}</TableCell>
                  </TableRow>
                  {cashFlow.adjustments.map((adj, idx) => (
                    <TableRow key={`adj-${idx}`} className="text-xs text-slate-500 italic">
                      <TableCell className="pl-6">{adj.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(adj.amount)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* Summary */}
              <TableRow className="h-8">
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow className="border-t-2 border-slate-300 font-bold bg-slate-50">
                <TableCell className="text-base text-lg">
                  {CashFlowReportLabel.NET_CHANGE}
                </TableCell>
                <TableCell
                  className={`text-right text-lg ${cashFlow.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {cashFlow.netChange >= 0 ? '+' : ''}
                  {formatCurrency(cashFlow.netChange)}
                </TableCell>
              </TableRow>
              <TableRow className="text-muted-foreground">
                <TableCell className="pl-6">{CashFlowReportLabel.BEGINNING_BALANCE}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(cashFlow.beginningBalance)}
                </TableCell>
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell className="pl-6">{CashFlowReportLabel.ENDING_BALANCE}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(cashFlow.endingBalance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowView;
