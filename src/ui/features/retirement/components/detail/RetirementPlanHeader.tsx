import React from 'react';

import { Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { type RetirementPlanHeaderVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

interface RetirementPlanHeaderProps {
  header: RetirementPlanHeaderVM;
  handleSaveName: (name: string) => Promise<void>;
  handleRecalculate: () => Promise<void>;
  handleToggleAutoUpdate: () => Promise<void>;
}

export const RetirementPlanHeader: React.FC<RetirementPlanHeaderProps> = ({
  header,
  handleSaveName,
  handleRecalculate,
  handleToggleAutoUpdate,
}) => {
  const navigate = useNavigate();

  return (
    <PageHeader
      crumb="RETIREMENT"
      onBack={() => navigate('/retirement')}
      title={<InlineEditableTitle value={header.name} onSave={handleSaveName} />}
      description={header.retirementSummaryText}
      actions={
        <div className="flex gap-2">
          <Button
            variant={header.autoUpdate ? 'default' : 'outline'}
            size="sm"
            onClick={() => void handleToggleAutoUpdate()}
            className={header.autoUpdate ? 'bg-primary hover:bg-primary/90' : ''}
          >
            {header.autoUpdate ? 'Auto-Update: ON' : 'Auto-Update: OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleRecalculate()}>
            <Calculator className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
        </div>
      }
    />
  );
};
