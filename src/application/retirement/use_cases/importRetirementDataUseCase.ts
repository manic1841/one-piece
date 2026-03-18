import { startOfMonth, subMonths } from 'date-fns';

import { queryJournalEntriesUseCase } from '@/application/ledger/use_cases/queryJournalEntriesUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { importRetirementExpensesFromProjects } from '@/application/retirement/services/retirementProjectImportService';
import { calculateIncomeSourceSuggestions } from '@/domains/retirement/logic/retirementPlanLogic';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
} from '@/domains/retirement/types';

interface ImportRetirementDataRequest {
  householdId: string;
  referenceMonths: number;
  type: 'projects' | 'transactions';
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

export class ImportRetirementDataUseCase {
  async execute(
    request: ImportRetirementDataRequest,
  ): Promise<RetirementExpenseCategory[] | RetirementIncomeSource[]> {
    const { householdId, referenceMonths, type, auth } = request;

    if (type === 'projects') {
      return this.importFromProjects(householdId);
    } else {
      return this.importFromTransactions(householdId, referenceMonths, auth);
    }
  }

  private async importFromProjects(householdId: string): Promise<RetirementExpenseCategory[]> {
    const projects = await listProjectsUseCase.execute({ householdId });
    const activeProjects = projects.filter((p) => p.isActive);
    const projectMappings = activeProjects.reduce<Record<string, string>>((acc, project) => {
      acc[project.id] = crypto.randomUUID();
      return acc;
    }, {});

    return importRetirementExpensesFromProjects({
      householdId,
      referenceMonths: 12,
      projectMappings,
      projects: activeProjects.map((project) => ({
        id: project.id,
        name: project.name,
      })),
    });
  }

  private async importFromTransactions(
    householdId: string,
    referenceMonths: number,
    auth: { uid: string; isGlobalAdmin: boolean },
  ): Promise<RetirementIncomeSource[]> {
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, referenceMonths));

    const transactions = await queryJournalEntriesUseCase.execute({
      householdId,
      startDate,
      endDate,
      auth,
    });

    const mappedIncomes = transactions
      .filter((t) => t.ledgerCode.startsWith('income:'))
      .map((t) => ({
        category: t.ledgerCode,
        amount: (t.credit || 0) - (t.debit || 0),
        date: t.date,
      }));

    // Domain logic expects raw mapped data and returns RetirementIncomeSource suggestions
    return calculateIncomeSourceSuggestions(mappedIncomes as any, referenceMonths);
  }
}

export const importRetirementDataUseCase = new ImportRetirementDataUseCase();
