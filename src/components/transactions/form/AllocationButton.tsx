import React from 'react';
import { Button } from '@/components/ui/button';
import { type Project } from '../../../schemas';

interface AllocationButtonProps {
  showAllocations: boolean;
  setShowAllocations: (show: boolean) => void;
  allocationsLength: number;
  setAllocations: (allocations: { projectId: string; percentage: number }[]) => void;
  projects: Project[];
}

export const AllocationButton: React.FC<AllocationButtonProps> = ({
  showAllocations,
  setShowAllocations,
  allocationsLength,
  setAllocations,
  projects,
}) => {
  const handleClick = () => {
    setShowAllocations(!showAllocations);
    if (!showAllocations && allocationsLength === 0) {
      setAllocations(projects.map((p) => ({ projectId: p.id, percentage: 0 })));
    }
  };

  return (
    <Button
      type="button"
      variant={showAllocations ? 'default' : 'outline'}
      onClick={handleClick}
      className={`w-full ${showAllocations ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' : ''}`}
    >
      {showAllocations ? '✓ Allocate to Projects' : 'Allocate to Projects'}
    </Button>
  );
};
