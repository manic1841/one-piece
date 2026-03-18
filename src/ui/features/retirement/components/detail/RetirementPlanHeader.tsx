import React from 'react';

import { ArrowLeft, Calculator, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { type RetirementPlan } from '@/domains/retirement/types';

interface RetirementPlanHeaderProps {
  plan: RetirementPlan;
  isEditingName: boolean;
  editedName: string;
  setEditedName: (name: string) => void;
  setIsEditingName: (isEditing: boolean) => void;
  handleSaveName: () => Promise<void>;
  handleCancelEditName: () => void;
  handleRecalculate: () => Promise<void>;
  handleToggleAutoUpdate: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

export const RetirementPlanHeader: React.FC<RetirementPlanHeaderProps> = ({
  plan,
  isEditingName,
  editedName,
  setEditedName,
  setIsEditingName,
  handleSaveName,
  handleCancelEditName,
  handleRecalculate,
  handleToggleAutoUpdate,
  handleDelete,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" onClick={() => navigate('/retirement')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-2xl font-bold h-auto py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEditName();
                }}
              />
              <Button size="sm" onClick={handleSaveName}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEditName}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEditingName(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground">
            Retire at {plan.retirementAge}, life expectancy {plan.lifeExpectancy}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant={plan.autoUpdate ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleAutoUpdate}
          className={plan.autoUpdate ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          {plan.autoUpdate ? '??Auto-Update: ON' : '?? Auto-Update: OFF'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRecalculate}>
          <Calculator className="mr-2 h-4 w-4" />
          Recalculate
        </Button>
        <Button variant="outline" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};
