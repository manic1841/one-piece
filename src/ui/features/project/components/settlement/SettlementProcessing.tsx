import type React from 'react';

export const SettlementProcessing: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-muted-foreground">Processing settlement...</p>
    </div>
  );
};
