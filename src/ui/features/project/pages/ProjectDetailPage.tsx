import React, { useEffect, useMemo, useState } from 'react';

import { Power } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { type Project } from '@/domains/project/schemas';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { useAuth } from '@/infra/contexts/useAuth';
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
import {
  ProjectDetailItemType,
  type ProjectRecordItemVM,
  type ProjectSnapshotItemVM,
} from '@/ui/features/project/viewmodels/projectDetail.vm';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';
import { formatCurrency } from '@/ui/utils';

interface ProjectDetailPageProps {
  project?: Project;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

interface ExpenseBreakdownRow {
  categoryLabel: string;
  amountText: string;
}

const toExpenseBreakdown = (
  items: (ProjectRecordItemVM | ProjectSnapshotItemVM)[],
): ExpenseBreakdownRow[] => {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.type !== ProjectDetailItemType.RECORD) continue;
    if (item.isIncome) continue;
    totals.set(item.categoryLabel, (totals.get(item.categoryLabel) ?? 0) + item.amount);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryLabel, amount]) => ({
      categoryLabel,
      amountText: formatCurrency(amount),
    }));
};

export default function ProjectDetailPage({ project }: ProjectDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId ?? '';

  const {
    items,
    selectedYearMonth,
    setSelectedYearMonth,
    currentSnapshot,
  } = useProjectDetailView(householdId, id || '');

  const [projectDebt, setProjectDebt] = React.useState<{ id: string; name: string; balanceText: string }[]>([]);
  const [fetchedProject, setFetchedProject] = useState<Project | null>(null);
  const [statusOverride, setStatusOverride] = useState<boolean | null>(null);
  const { updateProject } = useProjectCmds(householdId);

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!householdId || !id) return;
      const accounts = await listDebtAccountsUseCase.execute({
        householdId,
        includeInactive: true,
      });
      if (!ignore) {
        setProjectDebt(
          accounts
            .filter((a) => a.linkedProjectId === id)
            .map((a) => ({
              id: a.id,
              name: a.name,
              balanceText: formatCurrency(a.currentBalance),
            })),
        );
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [householdId, id]);

  const activeProject = project ?? fetchedProject;

  React.useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (project || !householdId || !id) return;
      try {
        const { getProjectUseCase } = await import(
          '@/application/project/use_cases/getProjectUseCase'
        );
        const data = await getProjectUseCase.execute({ householdId, projectId: id });
        if (!ignore) {
          setFetchedProject(data);
        }
      } catch {
        if (!ignore) setFetchedProject(null);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [project, householdId, id]);

  const handleRename = async (name: string) => {
    if (!activeProject) return;
    await updateProject(activeProject.id, { name });
    setFetchedProject((prev) => (prev && prev.id === activeProject.id ? { ...prev, name } : prev));
  };

  const isActive = statusOverride ?? (activeProject?.isActive !== false);

  const handleToggleActive = async () => {
    if (!activeProject) return;
    const nextActive = !isActive;

    const updated = await updateProject(activeProject.id, { isActive: nextActive });
    if (updated === undefined) return;
    setStatusOverride(nextActive);
    if (!project) {
      const { getProjectUseCase } = await import(
        '@/application/project/use_cases/getProjectUseCase'
      );
      const data = await getProjectUseCase.execute({ householdId, projectId: activeProject.id });
      if (data) setFetchedProject(data);
    }
  };

  useEffect(() => {
    setStatusOverride(null);
  }, [id]);

  const records = useMemo(
    () => items.filter((item): item is ProjectRecordItemVM => item.type === ProjectDetailItemType.RECORD),
    [items],
  );

  const snapshots = useMemo(
    () => items.filter((item): item is ProjectSnapshotItemVM => item.type === ProjectDetailItemType.SNAPSHOT),
    [items],
  );

  const expenseBreakdown = useMemo(() => toExpenseBreakdown(items), [items]);

  const summary = useMemo(() => {
    const income = records.filter((r) => r.isIncome).reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter((r) => !r.isIncome).reduce((sum, r) => sum + r.amount, 0);
    const net = income - expense;
    return { income, expense, net, balanceText: formatCurrency(currentSnapshot?.closingBalance ?? net) };
  }, [records, currentSnapshot]);

  if (!id || !activeProject) return <div>Project not found</div>;

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
