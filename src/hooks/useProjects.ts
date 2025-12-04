import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services/projectService';
import { projectTransactionService } from '../services/projectTransactionService';
import { transactionService } from '../services/transactionService';
import { type Project, type Transaction, type ProjectTransaction } from '../schemas';
import { useLoadingTask } from './useLoadingTask';

export function useProjectsNew(householdId: string, active: boolean) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { loading, error, run } = useLoadingTask();
  const load = useCallback(async () => {
    run(async () => {
      const data = await projectService.getProjects(householdId);
      setProjects(data);
    });
  }, [run, householdId]);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  return {
    projects,
    loading,
    error,
    reload: load,
  };
}

export interface ProjectWithBalance extends Project {
  balance: number;
  incomingAllocations: number;
  incomingTransfers: number;
  outgoingTransfers: number;
  totalTransactions: number;
}

export type CombinedTransaction =
  | { type: 'transaction'; data: Transaction }
  | { type: 'projectTransaction'; data: ProjectTransaction };

export const useProjects = (householdId?: string) => {
  const [projects, setProjects] = useState<ProjectWithBalance[]>([]);
  const [allProjectTransactions, setAllProjectTransactions] = useState<ProjectTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const [projectsData, projectTransactionsData, transactionsData] = await Promise.all([
        projectService.getProjects(householdId),
        projectTransactionService.getProjectTransactions(householdId),
        transactionService.getTransactions(householdId),
      ]);

      setAllProjectTransactions(projectTransactionsData);
      setAllTransactions(transactionsData);

      // Calculate balance for each project
      const projectsWithBalance: ProjectWithBalance[] = projectsData.map((project) => {
        // Incoming allocations (type = 'allocation', toProject = projectId)
        const incomingAllocations = projectTransactionsData
          .filter((pt) => pt.type === 'allocation' && pt.toProject === project.id)
          .reduce((sum, pt) => sum + pt.amount, 0);

        // Incoming transfers (type = 'transfer', toProject = projectId)
        const incomingTransfers = projectTransactionsData
          .filter((pt) => pt.type === 'transfer' && pt.toProject === project.id)
          .reduce((sum, pt) => sum + pt.amount, 0);

        // Outgoing transfers (type = 'transfer', fromProject = projectId)
        const outgoingTransfers = projectTransactionsData
          .filter((pt) => pt.type === 'transfer' && pt.fromProject === project.id)
          .reduce((sum, pt) => sum + pt.amount, 0);

        // All transactions for this project (income adds, expense subtracts)
        const totalTransactions = transactionsData
          .filter((t) => t.projectId === project.id)
          .reduce((sum, t) => {
            return t.type === 'income' ? sum + t.amount : sum - t.amount;
          }, 0);

        // Calculate total balance
        const balance =
          incomingAllocations + incomingTransfers - outgoingTransfers + totalTransactions;

        return {
          ...project,
          balance,
          incomingAllocations,
          incomingTransfers,
          outgoingTransfers,
          totalTransactions,
        };
      });

      setProjects(projectsWithBalance);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get combined transactions for a specific project
  const getProjectTransactions = useCallback(
    (projectId: string): CombinedTransaction[] => {
      const projectTxs: CombinedTransaction[] = allProjectTransactions
        .filter((pt) => pt.toProject === projectId || pt.fromProject === projectId)
        .map((pt) => ({ type: 'projectTransaction', data: pt }));

      const regularTxs: CombinedTransaction[] = allTransactions
        .filter((t) => t.projectId === projectId)
        .map((t) => ({ type: 'transaction', data: t }));

      // Combine and sort by date (newest first)
      const combined = [...projectTxs, ...regularTxs];
      combined.sort((a, b) => {
        const dateA = a.data.date;

        const dateB = b.data.date;

        return dateB.getTime() - dateA.getTime();
      });

      return combined;
    },
    [allProjectTransactions, allTransactions],
  );

  return {
    projects,
    loading,
    selectedProject,
    setSelectedProject,
    getProjectTransactions,
    reloadData: loadData,
  };
};
