import React from 'react';

import { Button } from '@/components/ui/button';

interface ReportLoadingStateProps {
  message?: string;
}

export const ReportLoadingState: React.FC<ReportLoadingStateProps> = ({
  message = '正在載入報表...',
}) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

interface ReportErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ReportErrorState: React.FC<ReportErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <Button className="mt-4" onClick={onRetry}>
            重新載入
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ReportEmptyStateProps {
  message?: string;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({ message = '無法載入報表' }) => {
  return <div className="text-center text-muted-foreground py-12">{message}</div>;
};
