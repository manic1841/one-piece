import { AllocationButton } from '@/components/records/form/AllocationButton';
import { AllocationSection } from '@/components/records/form/AllocationSection';
import { ProjectSelection } from '@/components/records/form/ProjectSelection';
import { type RecordFormData } from '@/domains/record/types';
import { type Project } from '@/schemas';

interface IncomeSectionProps {
  editing: boolean;
  showAllocations: boolean;
  setShowAllocations: (show: boolean) => void;
  onChanged: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
  projects: Project[];
  projectId: string;
  projectsLoading: boolean;
  allocations: RecordFormData['allocations'];
  amount: string;
  totalPercentage: number;
}

export const IncomeSection: React.FC<IncomeSectionProps> = ({
  editing,
  showAllocations,
  setShowAllocations,
  onChanged,
  projects,
  projectId,
  projectsLoading,
  allocations,
  amount,
  totalPercentage,
}) => {
  return (
    <>
      {!showAllocations && (
        <ProjectSelection
          projectId={projectId}
          onChange={(projectId: string) => onChanged('projectId', projectId)}
          projects={projects}
          loading={projectsLoading}
        />
      )}

      {/* Allocate Button (Income Only) */}
      {!editing && (
        <AllocationButton
          showAllocations={showAllocations}
          setShowAllocations={setShowAllocations}
        />
      )}

      {/* Allocations Section */}
      {(showAllocations || editing) && (
        <AllocationSection
          projects={projects}
          allocations={allocations}
          amount={amount}
          totalPercentage={totalPercentage}
          onChanged={onChanged}
        />
      )}
    </>
  );
};
