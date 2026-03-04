import type { RetirementProjectionYear } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

interface RetirementYearlyTableProps {
  projection: RetirementProjectionYear[];
}

export default function RetirementYearlyTable({ projection }: RetirementYearlyTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">Year</th>
            <th className="p-2 text-left">Age</th>
            <th className="p-2 text-right">Income</th>
            <th className="p-2 text-right">Expense</th>
            <th className="p-2 text-right">Net</th>
            <th className="p-2 text-right">Investment</th>
            <th className="p-2 text-right">Balance</th>
            <th className="p-2 text-left">Events</th>
          </tr>
        </thead>
        <tbody>
          {projection.map((year) => (
            <tr key={year.year} className={`border-b ${year.isRetired ? 'bg-blue-50' : ''}`}>
              <td className="p-2">{year.year}</td>
              <td className="p-2">
                {year.age} {year.isRetired && '🏖️'}
              </td>
              <td className="p-2 text-right text-green-600">{formatCurrency(year.totalIncome)}</td>
              <td className="p-2 text-right text-red-600">{formatCurrency(year.totalExpense)}</td>
              <td
                className={`p-2 text-right font-medium ${year.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {year.netCashFlow >= 0 ? '+' : ''}
                {formatCurrency(year.netCashFlow)}
              </td>
              <td className="p-2 text-right text-blue-600">
                {formatCurrency(year.investmentIncome)}
              </td>
              <td
                className={`p-2 text-right font-bold ${year.closingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {formatCurrency(year.closingBalance)}
              </td>
              <td className="p-2 text-xs text-muted-foreground">{year.events.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
