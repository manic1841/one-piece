import React from 'react';

import { Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { type RetirementPlanHeaderVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

interface RetirementPlanHeaderProps {
  header: RetirementPlanHeaderVM;
  isEditingName: boolean;
  editedName: string;
  setEditedName: (name: string) => void;
  handleSaveName: () => Promise<void>;
  handleCancelEditName: () => void;
  handleRecalculate: () => Promise<void>;
  handleToggleAutoUpdate: () => Promise<void>;
}

export const RetirementPlanHeader: React.FC<RetirementPlanHeaderProps> = ({
  header,
  isEditingName,
  editedName,
  setEditedName,
  handleSaveName,
  handleCancelEditName,
  handleRecalculate,
  handleToggleAutoUpdate,
}) => {
  const navigate = useNavigate();

  return (
    <PageHeader
      crumb="RETIREMENT"
      onBack={() => navigate('/retirement')}
      title={
        isEditingName ? (
          <span className="inline-flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(event) => setEditedName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSaveName();
                if (event.key === 'Escape') handleCancelEditName();
              }}
              autoFocus
              aria-label="Rename"
              className="h-8 max-w-56 text-2xl font-bold"
            />
            <Button size="sm" onClick={() => void handleSaveName()}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEditName}>
              Cancel
            </Button>
          </span>
        ) : (
          <InlineEditableTitle
            value={header.name}
            onSave={async () => {
              await handleSaveName();
            }}
          />
        )
      }
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
