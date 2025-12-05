import { type Project } from '../../../schemas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '../../../utils/formatUtils';
import { type RecordFormData } from '@/domains/record/types';

interface AllocationSectionProps {
  projects: Project[];
  allocations: { projectId: string; percentage: string }[];
  amount: string;
  totalPercentage: number;
  onChanged?: <k extends keyof RecordFormData>(name: k, value: RecordFormData[k]) => void;
}

export const AllocationSection: React.FC<AllocationSectionProps> = ({
  projects,
  allocations,
  amount,
  totalPercentage,
  onChanged,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Project Allocations</Label>
        <span
          className={`text-sm font-medium ${
            Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          Total: {totalPercentage.toFixed(1)}%
        </span>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 max-h-60 overflow-y-auto">
          {projects.map((project) => {
            const allocation = allocations.find((a) => a.projectId === project.id);
            const percentage = parseFloat(allocation?.percentage || '0');
            const allocatedAmount = amount ? (parseFloat(amount) * percentage) / 100 : 0;

            return (
              <div key={project.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{project.icon}</span>
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                </div>
                <div className="w-24">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="text-right pr-6"
                      value={percentage}
                      onChange={(e) => {
                        onChanged?.('allocations', [
                          ...allocations.filter((a) => a.projectId !== project.id),
                          { projectId: project.id, percentage: e.target.value },
                        ]);
                      }}
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-muted-foreground">
                  {formatCurrency(allocatedAmount)}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
