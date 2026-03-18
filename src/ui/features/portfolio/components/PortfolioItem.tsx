import React from 'react';

import { ArrowDown, ArrowUp, Edit, Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { type PortfolioListItemViewModel } from '@/domains/portfolio/types';
import { formatCurrency } from '@/ui/utils';

interface PortfolioItemProps {
  viewModel: PortfolioListItemViewModel;
  onClick: (id: string) => void;
  onEdit?: (id: string) => void;
  isReorderMode?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

export const PortfolioItem: React.FC<PortfolioItemProps> = ({
  viewModel,
  onClick,
  onEdit,
  isReorderMode,
  onMoveUp,
  onMoveDown,
}) => {
  return (
    <Card
      className={`group cursor-pointer transition-colors relative ${
        isReorderMode ? 'hover:bg-slate-50' : 'hover:bg-slate-50'
      }`}
      onClick={() => !isReorderMode && onClick(viewModel.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{viewModel.name}</CardTitle>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isReorderMode && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(viewModel.id);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Delete functionality
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isReorderMode && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.(viewModel.id);
                }}
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.(viewModel.id);
                }}
              >
                <ArrowDown size={14} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">
            {viewModel.totalValue > 0 ? formatCurrency(viewModel.totalValue) : '--'}
          </div>
          {viewModel.asOfDate && (
            <span className="text-sm font-medium text-muted-foreground">
              ({viewModel.asOfDate.replace('-', '/')})
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {viewModel.accountCount} linked accounts
        </p>
        {viewModel.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{viewModel.description}</p>
        )}
      </CardContent>
    </Card>
  );
};
