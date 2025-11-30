import type {
  CashFlowStatement,
  CashFlowItem,
  CashFlowSection,
} from '../../../schemas/cashFlow';
import type { Transaction, Project } from '../../../schemas';
import { Timestamp } from 'firebase/firestore';

/**
 * Calculate cash flow statement from transactions
 */
export function calculateCashFlow(
  transactions: Transaction[],
  projects: Project[],
  startDate: Date,
  endDate: Date,
  beginningBalance: number,
  createdBy: string,
  householdId: string,
): CashFlowStatement {
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;

  // Initialize sections
  const operatingItems: CashFlowItem[] = [];
  const investingItems: CashFlowItem[] = [];
  const financingItems: CashFlowItem[] = [];

  // Helper to find project
  const getProject = (id?: string) => projects.find((p) => p.id === id);

  // Process transactions
  for (const tx of transactions) {
    // Skip internal transfers unless they cross boundaries (e.g., to investment)
    // For simplicity in this version, we'll focus on Income/Expense and specific transfers
    
    let section: 'operating' | 'investing' | 'financing' = 'operating';
    const amount = tx.amount;
    
    // Determine section based on project or category
    const project = getProject(tx.projectId);
    
    if (project?.accounting?.cashFlow?.category) {
      section = project.accounting.cashFlow.category as any;
    } else {
      // Default logic if no project config
      if (tx.type === 'income') {
        section = (tx.category === '投資收益' || tx.category === '股息') ? 'investing' : 'operating';
      } else if (tx.type === 'expense') {
        if (tx.category === '投資' || tx.projectId === 'investment') {
          section = 'investing';
        } else {
          section = (tx.category === '貸款' || tx.category === '還款') ? 'financing' : 'operating';
        }
      } else {
        // Skip transfers for now
        continue; 
      }
    }

    // Sign convention: Inflow positive, Outflow negative
    const signedAmount = tx.type === 'expense' ? -amount : amount;

    const item: CashFlowItem = {
      id: tx.id,
      name: tx.description || tx.category,
      amount: signedAmount,
      category: tx.category,
    };

    if (section === 'operating') {
      operatingItems.push(item);
    } else if (section === 'investing') {
      investingItems.push(item);
    } else if (section === 'financing') {
      financingItems.push(item);
    }
  }

  // Group items by category/name to reduce noise
  const groupItems = (items: CashFlowItem[]): CashFlowItem[] => {
    const map = new Map<string, CashFlowItem>();
    for (const item of items) {
      const key = item.category || item.name; // Group by category primarily
      const existing = map.get(key);
      if (existing) {
        existing.amount += item.amount;
      } else {
        map.set(key, { ...item, id: `group-${key}`, name: key });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  };

  const operatingSection: CashFlowSection = {
    items: groupItems(operatingItems),
    netAmount: operatingItems.reduce((sum, item) => sum + item.amount, 0),
  };

  const investingSection: CashFlowSection = {
    items: groupItems(investingItems),
    netAmount: investingItems.reduce((sum, item) => sum + item.amount, 0),
  };

  const financingSection: CashFlowSection = {
    items: groupItems(financingItems),
    netAmount: financingItems.reduce((sum, item) => sum + item.amount, 0),
  };

  const netChange =
    operatingSection.netAmount +
    investingSection.netAmount +
    financingSection.netAmount;

  return {
    id: `cash-flow-${householdId}-${year}-${month}`,
    startDate,
    endDate,
    periodType: 'monthly', // Defaulting to monthly for now
    year,
    month,
    operating: operatingSection,
    investing: investingSection,
    financing: financingSection,
    netChange,
    beginningBalance,
    endingBalance: beginningBalance + netChange,
    createdAt: Timestamp.now(),
    createdBy,
  };
}
