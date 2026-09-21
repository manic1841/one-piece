import React from 'react';

import { cn } from '@/ui/utils/cn';

interface CompactRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testId: string;
}

const CompactRow: React.FC<CompactRowProps> = ({ children, onClick, className, testId }) => (
  <div
    data-testid={testId}
    onClick={onClick}
    className={cn('rounded-md border p-3 md:hidden', className)}
  >
    {children}
  </div>
);

export default CompactRow;
