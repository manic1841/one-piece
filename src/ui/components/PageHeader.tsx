import React from 'react';

import { ArrowLeft } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  crumb?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  crumb,
  badge,
  meta,
  actions,
  onBack,
}) => {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          {crumb && (
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {crumb}
            </p>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-heading">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          {meta}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
