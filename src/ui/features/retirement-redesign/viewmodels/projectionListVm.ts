import { type ProjectionDocument } from '@/application/retirement/use_cases/listProjectionsUseCase';
import { ENGINE_VERSION } from '@/domains/retirement/logic/projectionEngine';
import { formatCurrency, formatDate } from '@/ui/utils';

export interface ProjectionListRowVM {
  id: string;
  name: string;
  createdAtText: string;
  retirementNetWorthText: string;
  finalNetWorthText: string;
  isBankrupt: boolean;
  isStale: boolean;
}

const moneyText = (value: number | null): string => (value === null ? '—' : formatCurrency(value));

export const mapProjectionToListRowVM = (projection: ProjectionDocument): ProjectionListRowVM => ({
  id: projection.id,
  name: projection.name,
  createdAtText: formatDate(projection.createdAt),
  retirementNetWorthText: moneyText(projection.retirementNetWorth),
  finalNetWorthText: formatCurrency(projection.finalNetWorth),
  isBankrupt: projection.isBankrupt,
  isStale: projection.engineVersion < ENGINE_VERSION,
});
