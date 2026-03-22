import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import {
  type ProjectTransferFormState,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { ChipGroup } from './ChipGroup';

type ProjectTransferPanelProps = {
  state: ProjectTransferFormState;
  projects: TransactionFormProjectOption[];
  onChange: (next: ProjectTransferFormState) => void;
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.icon ? `${project.icon} ` : ''}${project.name}`,
  }));

export function ProjectTransferPanel({ state, projects, onChange }: ProjectTransferPanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-2">
        <Label htmlFor="project-transfer-amount">金額</Label>
        <Input
          id="project-transfer-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={state.amount}
          onChange={(event) => onChange({ ...state, amount: event.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>從專案</Label>
          <ChipGroup
            options={toProjectOptions(projects)}
            value={state.fromProjectId}
            onChange={(fromProjectId) => onChange({ ...state, fromProjectId })}
            tone="neutral"
          />
        </div>
        <div className="space-y-2">
          <Label>到專案</Label>
          <ChipGroup
            options={toProjectOptions(projects.filter((p) => p.id !== state.fromProjectId))}
            value={state.toProjectId}
            onChange={(toProjectId) => onChange({ ...state, toProjectId })}
            tone="neutral"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-transfer-description">說明</Label>
        <Textarea
          id="project-transfer-description"
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="例如：補貼旅遊專案"
        />
      </div>
    </div>
  );
}

