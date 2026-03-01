import { type ProjectDetailData, ProjectDetailType } from '@/domains/project/types';
import { type ProjectSnapshot } from '@/domains/project/types';

export const toSnapshotDetailItem = (snapshot: ProjectSnapshot): ProjectDetailData => {
  return {
    id: snapshot.id,
    type: ProjectDetailType.SNAPSHOT,
    category: '月結結算', // Default label for the category
    date: new Date(snapshot.year, snapshot.month, 0, 23, 59, 59), // End of the month
    amount: snapshot.closingBalance,
    description: `${snapshot.year}年${snapshot.month}月 結算`,
    label: 'Settlement',
    snapshot: {
      year: snapshot.year,
      month: snapshot.month,
      openingBalance: snapshot.openingBalance,
      closingBalance: snapshot.closingBalance,
      income: snapshot.income,
      expense: snapshot.expense,
    },
  };
};
