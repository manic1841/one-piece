import React from 'react';

import { cn } from '@/ui/utils/cn';

interface GateSurfaceProps {
  children?: React.ReactNode;
  className?: string;
}

export const GateSurface: React.FC<GateSurfaceProps> = ({ children, className }) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <div className={cn('w-full max-w-md', className)}>{children}</div>
  </div>
);
