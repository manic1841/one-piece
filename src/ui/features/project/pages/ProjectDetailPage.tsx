import React from 'react';

import { Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Button } from '@/ui/components/ui/button';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { useProjectDetailPage } from '@/ui/features/project/hooks/useProjectDetailPage';
import { type Project } from '@/ui/features/project/viewmodels/projectForm.vm';
import { formatCurrency } from '@/ui/utils';

interface ProjectDetailPageProps {
  project?: Project;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

export default function ProjectDetailPage({ project }: ProjectDetailPageProps) {
  const navigate = useNavigate();
  const {
    projectId,
    activeProject,
    projectDebt,
    isActive,
    records,
    snapshots,
    expenseBreakdown,
    summary,
    selectedYearMonth,
    setSelectedYearMonth,
    handleRename,
    handleToggleActive,
  } = useProjectDetailPage({ project });

  if (!projectId || !activeProject) return <div>Project not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={
          <InlineEditableTitle value={activeProject.name} onSave={handleRename} />
        }
        crumb="PROJECTS"
        onBack={() => navigate('/projects')}
        badge={
          !isActive ? (
            <StatusGlyph type="inactive" />
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button variant="outline" onClick={() => void handleToggleActive()}>
                <Power size={16} />
                停用 Project
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void handleToggleActive()}>
                啟用 Project
              </Button>
            )}
            <YearMonthPicker
              year={selectedYearMonth === 'current' ? String(new Date().getFullYear()) : selectedYearMonth.split('-')[0]}
              month={selectedYearMonth === 'current' ? String(new Date().getMonth() + 1) : selectedYearMonth.split('-')[1]}
              onYearChange={(year) => {
                const month = selectedYearMonth === 'current' ? String(new Date().getMonth() + 1) : selectedYearMonth.split('-')[1];
                setSelectedYearMonth(`${year}-${month}`);
              }}
              onMonthChange={(month) => {
                const year = selectedYearMonth === 'current' ? String(new Date().getFullYear()) : selectedYearMonth.split('-')[0];
                setSelectedYearMonth(`${year}-${month}`);
              }}
            />
            {selectedYearMonth !== 'current' && (
              <Button variant="ghost" onClick={() => setSelectedYearMonth('current')}>
                本月
              </Button>
            )}
          </div>
        }
      />

      <section className="space-y-3">
        <SectionTitle>SUMMARY</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-mono tabular-nums text-positive">{formatCurrency(summary.income)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="font-mono tabular-nums text-negative">{formatCurrency(summary.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            <p
              className={`font-mono tabular-nums ${summary.net >= 0 ? 'text-positive' : 'text-negative'}`}
            >
              {formatCurrency(summary.net)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-mono text-lg tabular-nums text-foreground">{summary.balanceText}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>12M CASH FLOW</SectionTitle>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無現金流紀錄</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-[12px]">{record.dateText}</TableCell>
                  <TableCell className="text-muted-foreground">{record.categoryLabel}</TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${record.isIncome ? 'text-positive' : 'text-negative'}`}
                  >
                    {record.amountText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>EXPENSE BREAKDOWN</SectionTitle>
        {expenseBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無支出紀錄</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseBreakdown.map((row) => (
                <TableRow key={row.categoryLabel}>
                  <TableCell className="text-muted-foreground">{row.categoryLabel}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.amountText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>PROJECT DEBT</SectionTitle>
        {projectDebt.length === 0 ? (
          <p className="text-sm text-muted-foreground">此專案沒有連結貸款</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectDebt.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>{debt.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {debt.balanceText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>MONTHLY SNAPSHOT</SectionTitle>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無月度結算資料</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell className="font-mono text-[12px]">
                    {snapshot.year}-{String(snapshot.month).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {snapshot.openingBalanceText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {snapshot.incomeText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {snapshot.expenseText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {snapshot.closingBalanceText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
