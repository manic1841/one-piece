import React from 'react';

import { cn } from '@/ui/utils/cn';

export const LoadingLine: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex min-h-screen items-center justify-center', className)}>
    <span className="text-muted-foreground">Loading...</span>
  </div>
);
