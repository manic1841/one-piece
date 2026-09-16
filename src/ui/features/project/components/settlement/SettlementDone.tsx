import { CheckCircle2 } from 'lucide-react';

export const SettlementDone: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-positive/15 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-positive" />
      </div>
      <p className="text-lg font-semibold text-foreground">Settlement Complete!</p>
      <p className="text-muted-foreground mt-2">All snapshots have been created successfully.</p>
    </div>
  );
};
