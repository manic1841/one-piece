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

const CompactRow: React.FC<CompactRowProps> = ({
  children,
  onClick,
  className,
  testId,
  style,
  ref,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onClick) return;
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      ref={ref}
      data-testid={testId}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
      className={cn(
        'rounded-md border p-3 md:hidden',
        onClick &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default CompactRow;
