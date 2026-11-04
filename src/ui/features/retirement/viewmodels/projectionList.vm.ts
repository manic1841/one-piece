import { type ProjectionDocument } from '@/application/retirement/use_cases/listProjectionsUseCase';
import { ENGINE_VERSION } from '@/domains/retirement/calculators';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
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

const moneyText = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : formatCurrency(value);

export const mapProjectionToListRowVM = (projection: ProjectionDocument): ProjectionListRowVM => ({
  id: projection.id,
  name: projection.name,
  createdAtText: formatDate(projection.createdAt),
  retirementNetWorthText: moneyText(projection.retirementNetWorth),
  finalNetWorthText: formatCurrency(projection.finalNetWorth),
  isBankrupt: projection.isBankrupt,
  isStale: projection.engineVersion < ENGINE_VERSION,
});
