import React, { useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { financialReportService } from '@/services/financialReportService';
import type { FinancialReport, BalanceSheetItem, CashFlowItem } from '@/schemas/report';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IncomeStatementView from './IncomeStatementView';
import BalanceSheetView from './BalanceSheetView';
import CashFlowView from './CashFlowView';
import { toast } from 'sonner';


// Mappers to adapt FinancialReport data to View props
const mapToIncomeStatementView = (report: FinancialReport) => {
    if (report.type !== 'income_statement' || !('revenue' in report.data)) return null;
    const data = report.data as import('@/schemas/report').IncomeStatementData;

    return {
        id: report.id,
        startDate: report.startDate,
        endDate: report.endDate,
        periodType: 'monthly' as const,
        year: report.year,
        month: report.month,
        income: {
            total: data.revenue.total,
            categories: data.revenue.items.map(item => ({
                category: item.category,
                subtotal: item.amount,
                items: item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
                    id: `${item.category}-${idx}`,
                    category: item.category,
                    subcategory: sub.name,
                    amount: sub.amount,
                })) || [],
            })),
        },
        expense: {
            total: data.expenses.total,
            categories: data.expenses.items.map(item => ({
                category: item.category,
                subtotal: item.amount,
                items: item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
                    id: `${item.category}-${idx}`,
                    category: item.category,
                    subcategory: sub.name,
                    amount: sub.amount,
                })) || [],
            })),
        },
        netIncome: data.netIncome,
        createdAt: report.generatedAt,
        createdBy: report.generatedBy,
    };
};

const mapToBalanceSheetView = (report: FinancialReport) => {
    if (report.type !== 'balance_sheet' || !('assets' in report.data)) return null;
    const data = report.data as import('@/schemas/report').BalanceSheetData;

    // Helper to map items to categories
    const mapItems = (items: BalanceSheetItem[]) => items.map(item => ({
        category: item.category,
        subtotal: item.amount,
        items: item.subItems?.map((sub: { name: string; amount: number }, idx: number) => ({
            id: `${item.category}-${idx}`,
            name: sub.name,
            amount: sub.amount,
        })) || [],
    }));

    return {
        id: report.id,
        asOfDate: report.endDate,
        year: report.year,
        month: report.month,
        assets: {
            total: data.assets.total,
            current: mapItems(data.assets.items), // Simplified mapping: putting all in current for now or need logic to split
            investment: [],
            fixed: [],
        },
        liabilities: {
            total: data.liabilities.total,
            shortTerm: mapItems(data.liabilities.items),
            longTerm: [],
        },
        netWorth: data.equity.total, // Or Assets - Liabilities
        createdAt: report.generatedAt,
        createdBy: report.generatedBy,
    };
};

const mapToCashFlowView = (report: FinancialReport) => {
    if (report.type !== 'cash_flow' || !('operating' in report.data)) return null;
    const data = report.data as import('@/schemas/report').CashFlowData;

    const mapSection = (section: { netAmount: number; items: CashFlowItem[] }) => ({
        netAmount: section.netAmount,
        items: section.items.map((item, idx: number) => ({
            id: `${idx}`,
            name: item.category,
            amount: item.amount,
        })),
    });

    return {
        id: report.id,
        startDate: report.startDate,
        endDate: report.endDate,
        periodType: 'monthly' as const,
        year: report.year,
        month: report.month,
        operating: mapSection(data.operating),
        investing: mapSection(data.investing),
        financing: mapSection(data.financing),
        netChange: data.netChange,
        beginningBalance: data.beginningBalance,
        endingBalance: data.endingBalance,
        createdAt: report.generatedAt,
        createdBy: report.generatedBy,
    };
};

const FinancialReportGenerator: React.FC = () => {
    const { userProfile } = useAuth();
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(false);
    const [generatedReports, setGeneratedReports] = useState<{
        incomeStatement: FinancialReport;
        balanceSheet: FinancialReport;
        cashFlow: FinancialReport;
        reconciliation: { reconciled: boolean; difference: number };
    } | null>(null);

    const handleGenerate = async () => {
        if (!userProfile?.householdId || !userProfile.uid) return;
        setLoading(true);
        try {
            const result = await financialReportService.generateFinancialReports(
                userProfile.householdId,
                year,
                month,
                userProfile.uid
            );
            setGeneratedReports(result);
            toast.success('Reports generated successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate reports');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!generatedReports || !userProfile?.householdId) return;
        setLoading(true);
        try {
            await financialReportService.saveFinancialReports(userProfile.householdId, [
                generatedReports.incomeStatement,
                generatedReports.balanceSheet,
                generatedReports.cashFlow,
            ]);
            toast.success('Reports saved to database');
            setGeneratedReports(null); // Reset or navigate away
        } catch (error) {
            console.error(error);
            toast.error('Failed to save reports');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Generate Financial Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Year</label>
                            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[year - 1, year, year + 1].map((y) => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Month</label>
                            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={m.toString()}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGenerate} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {generatedReports && (
                <div className="space-y-6">
                    {/* Reconciliation Alert */}
                    {!generatedReports.reconciliation.reconciled ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Reconciliation Failed</AlertTitle>
                            <AlertDescription>
                                There is a discrepancy of {generatedReports.reconciliation.difference.toFixed(2)} between Balance Sheet Cash and Cash Flow Ending Balance.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert className="bg-green-50 text-green-900 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle>Reconciliation Successful</AlertTitle>
                            <AlertDescription>
                                Balance Sheet and Cash Flow Statement are consistent.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Tabs defaultValue="income" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="income">Income Statement</TabsTrigger>
                            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
                            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                        </TabsList>
                        <TabsContent value="income">
                            {(() => {
                                const viewProps = mapToIncomeStatementView(generatedReports.incomeStatement);
                                return viewProps ? <IncomeStatementView statement={viewProps as unknown as IncomeStatement} /> : null;
                            })()}
                        </TabsContent>
                        <TabsContent value="balance">
                            {(() => {
                                const viewProps = mapToBalanceSheetView(generatedReports.balanceSheet);
                                return viewProps ? <BalanceSheetView balanceSheet={viewProps as unknown as BalanceSheet} /> : null;
                            })()}
                        </TabsContent>
                        <TabsContent value="cashflow">
                            {(() => {
                                const viewProps = mapToCashFlowView(generatedReports.cashFlow);
                                return viewProps ? <CashFlowView cashFlow={viewProps as unknown as CashFlowStatement} /> : null;
                            })()}
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-4">
                        <Button variant="outline" onClick={() => setGeneratedReports(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Save Reports
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialReportGenerator;
