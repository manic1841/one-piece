import React from 'react';

import { ChevronDown, ChevronUp, Landmark, Scale, Wallet } from 'lucide-react';

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
  AssetSubCategoryLabel,
  BalanceSheetCategoryLabel,
  BalanceSheetReportLabel,
  EquitySubCategoryLabel,
  LiabilitySubCategoryLabel,
  ReportCommonLabel,
} from '@/constants/finance/financeLabel';
import type { BalanceSheetView as BalanceSheetViewData } from '@/domains/finance/mappers/reportToView';
import { BalanceSheetCategory } from '@/domains/finance/types/categories';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface BalanceSheetViewProps {
  balanceSheet: BalanceSheetViewData;
}

const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({ balanceSheet }) => {
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
    categories: Array<{
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    }>,
    sectionKey: string,
  ) => {
    return (
      <React.Fragment key={sectionKey}>
        {/* Section Header */}
        <TableRow className="bg-slate-100 font-bold hover:bg-slate-100">
          <TableCell colSpan={2}>{title}</TableCell>
        </TableRow>

        {categories.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-muted-foreground py-2 text-sm">
              {ReportCommonLabel.NO_DATA}
            </TableCell>
          </TableRow>
        ) : (
          categories.map((cat, idx) => renderCategory(cat, `${sectionKey}-${idx}`))
        )}
      </React.Fragment>
    );
  };

  const renderCategory = (
    category: {
      category: string;
      subtotal: number;
      items: Array<{ id: string; name: string; amount: number }>;
    },
    key: string,
  ) => {
    const isExpanded = expandedItems.has(key);
    const hasItems = category.items.length > 0;

    const allSubLabels = {
      ...AssetSubCategoryLabel,
      ...LiabilitySubCategoryLabel,
      ...EquitySubCategoryLabel,
    };
    const localizedCategory =
      (allSubLabels as Record<string, string>)[category.category] || category.category;

    return (
      <React.Fragment key={key}>
        <TableRow
          className="cursor-pointer hover:bg-slate-50"
          onClick={() => hasItems && toggleItem(key)}
        >
          <TableCell className="pl-6">
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
          <TableCell className="text-right font-medium">
            {formatCurrency(category.subtotal)}
          </TableCell>
        </TableRow>

        {isExpanded &&
          category.items.map((item) => (
            <TableRow key={item.id} className="bg-slate-50/30 text-slate-500 text-xs">
              <TableCell className="pl-16">{item.name}</TableCell>
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
        <h2 className="text-2xl font-bold">{BalanceSheetReportLabel.TITLE}</h2>
        <p className="text-sm text-muted-foreground mt-1">{formatDate(balanceSheet.asOfDate)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {BalanceSheetCategoryLabel[BalanceSheetCategory.ASSET]}
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(balanceSheet.assets.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {BalanceSheetCategoryLabel[BalanceSheetCategory.LIABILITY]}
            </CardTitle>
            <Landmark className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(balanceSheet.liabilities.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {BalanceSheetReportLabel.NET_WORTH}
            </CardTitle>
            <Scale className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${balanceSheet.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(balanceSheet.netWorth)}
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
                <TableHead>{ReportCommonLabel.SUBJECT}</TableHead>
                <TableHead className="text-right">{ReportCommonLabel.AMOUNT}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ASSETS SECTION */}
              <TableRow className="bg-blue-50 font-black text-blue-900 hover:bg-blue-50">
                <TableCell>{BalanceSheetCategoryLabel[BalanceSheetCategory.ASSET]}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.assets.total)}
                </TableCell>
              </TableRow>
              {renderSection(
                BalanceSheetReportLabel.CURRENT_ASSETS,
                balanceSheet.assets.current,
                'assets-current',
              )}
              {renderSection(
                BalanceSheetReportLabel.INVESTMENT_ASSETS,
                balanceSheet.assets.investment,
                'assets-investment',
              )}
              {renderSection(
                BalanceSheetReportLabel.FIXED_ASSETS,
                balanceSheet.assets.fixed,
                'assets-fixed',
              )}

              <TableRow className="h-4">
                <TableCell colSpan={2} />
              </TableRow>

              {/* LIABILITIES SECTION */}
              <TableRow className="bg-red-50 font-black text-red-900 hover:bg-red-50">
                <TableCell>{BalanceSheetCategoryLabel[BalanceSheetCategory.LIABILITY]}</TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(balanceSheet.liabilities.total)}
                </TableCell>
              </TableRow>
              {renderSection(
                BalanceSheetReportLabel.SHORT_TERM_LIABILITIES,
                balanceSheet.liabilities.shortTerm,
                'liabilities-short',
              )}
              {renderSection(
                BalanceSheetReportLabel.LONG_TERM_LIABILITIES,
                balanceSheet.liabilities.longTerm,
                'liabilities-long',
              )}

              <TableRow className="h-4">
                <TableCell colSpan={2} />
              </TableRow>

              {/* EQUITY SECTION */}
              <TableRow className="bg-slate-100 font-black text-slate-900 hover:bg-slate-100">
                <TableCell>{BalanceSheetCategoryLabel[BalanceSheetCategory.EQUITY]}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balanceSheet.equity.total)}
                </TableCell>
              </TableRow>
              {balanceSheet.equity.items.map((cat, idx) => renderCategory(cat, `equity-${idx}`))}

              {balanceSheet.adjustments.length > 0 && (
                <>
                  <TableRow className="h-4">
                    <TableCell colSpan={2} />
                  </TableRow>
                  <TableRow className="bg-slate-50 font-semibold text-slate-700">
                    <TableCell colSpan={2}>{ReportCommonLabel.ADJUSTMENTS}</TableCell>
                  </TableRow>
                  {balanceSheet.adjustments.map((adj, idx) => (
                    <TableRow key={`adj-${idx}`} className="text-xs text-slate-500 italic">
                      <TableCell className="pl-6">{adj.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(adj.amount)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              <TableRow className="h-4">
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow className="border-t-2 border-slate-300 font-bold bg-slate-50">
                <TableCell className="text-lg">{BalanceSheetReportLabel.NET_WORTH}</TableCell>
                <TableCell
                  className={`text-right text-lg ${balanceSheet.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(balanceSheet.netWorth)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="text-xs text-muted-foreground pt-2 pl-4">
                  {BalanceSheetReportLabel.NET_WORTH_NOTE}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheetView;
