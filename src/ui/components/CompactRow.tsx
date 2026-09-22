import React from 'react';

import { cn } from '@/ui/utils/cn';

interface CompactRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  testId: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}

const CompactRow: React.FC<CompactRowProps> = ({ children, onClick, className, testId, style, ref }) => (
  <div
    ref={ref}
    data-testid={testId}
    onClick={onClick}
    style={style}
    className={cn('rounded-md border p-3 md:hidden', className)}
  >
    {children}
  </div>
);

export default CompactRow;
