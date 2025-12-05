import { Button } from '@/components/ui/button';

interface AllocationButtonProps {
  showAllocations: boolean;
  setShowAllocations: (show: boolean) => void;
}

export const AllocationButton: React.FC<AllocationButtonProps> = ({
  showAllocations,
  setShowAllocations,
}) => {
  const handleClick = () => {
    setShowAllocations(!showAllocations);
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
