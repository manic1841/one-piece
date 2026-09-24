import { useState } from 'react';

import { Eye, Plus, X } from 'lucide-react';

import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { WATCH_LIST_LABELS, getWatchListTargetTypeLabel } from '@/ui/constants/watchListLabels';
import { type WatchListPickerData } from '@/ui/features/setting/hooks/useWatchListPickerData';
import { useWatchListSettings } from '@/ui/features/setting/hooks/useWatchListSettings';
import {
  WATCH_LIST_TARGET_TYPES,
  type Project,
  type WatchListTarget,
  type WatchListTargetType,
} from '@/ui/features/setting/viewmodels/setting.vm';

interface WatchListSettingsProps {
  pickerOptions?: WatchListPickerData;
}

const DEFAULT_OPTIONS: WatchListPickerData = {
  projects: [],
  ledgerCodes: [],
  debtAccounts: [],
};

interface PickerItem {
  id: string;
  label: string;
}

const toPickerItems = (items: { id?: string; code?: string; label: string }[]): PickerItem[] =>
  items.map((item) => ({ id: item.id ?? item.code ?? '', label: item.label }));

const WatchListSettings = ({ pickerOptions = DEFAULT_OPTIONS }: WatchListSettingsProps) => {
  const { targets, loading, saving, error, addTarget, removeTarget } = useWatchListSettings();
  const options = pickerOptions ?? DEFAULT_OPTIONS;
  const [selectedIds, setSelectedIds] = useState<Partial<Record<WatchListTargetType, string>>>({});

  const setSelectedId = (targetType: WatchListTargetType, id: string) =>
    setSelectedIds((prev) => ({ ...prev, [targetType]: id || undefined }));

  const availableFor = (targetType: WatchListTargetType): PickerItem[] => {
    const watchedIds = new Set(
      targets.filter((t) => t.targetType === targetType).map((t) => t.targetId),
    );
    switch (targetType) {
      case 'PROJECT':
        return toPickerItems(
          options.projects
            .filter((project: Project) => project.isActive && !watchedIds.has(project.id))
            .map((project) => ({ id: project.id, label: project.name })),
        );
      case 'LEDGER_CODE':
        return toPickerItems(
          options.ledgerCodes
            .filter((code) => !watchedIds.has(code.code))
            .map((code) => ({ id: code.code, label: code.label })),
        );
      case 'DEBT_ACCOUNT':
        return toPickerItems(
          options.debtAccounts
            .filter((account) => account.isActive && !watchedIds.has(account.id))
            .map((account) => ({ id: account.id, label: account.name })),
        );
    }
  };

  const targetsByType = (targetType: WatchListTargetType): WatchListTarget[] =>
    targets.filter((target) => target.targetType === targetType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="text-primary" size={20} />
          {WATCH_LIST_LABELS.cardTitle}
        </CardTitle>
        <CardDescription>{WATCH_LIST_LABELS.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && targets.length === 0 && (
          <p className="text-sm text-muted-foreground">{WATCH_LIST_LABELS.emptyMessage}</p>
        )}

        {WATCH_LIST_TARGET_TYPES.map((targetType) => {
          const typeTargets = targetsByType(targetType);
          const available = availableFor(targetType);
          const selectedId = selectedIds[targetType];
          return (
            <section key={targetType} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">{getWatchListTargetTypeLabel(targetType)}</h3>
                <select
                  aria-label={`${getWatchListTargetTypeLabel(targetType)} ${WATCH_LIST_LABELS.addTargetLabel}`}
                  className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedId ?? ''}
                  onChange={(event) => setSelectedId(targetType, event.target.value)}
                  disabled={saving || available.length === 0}
                >
                  <option value="">{WATCH_LIST_LABELS.addTargetLabel}</option>
                  {available.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving || !selectedId}
                  onClick={() => {
                    const selected = available.find((item) => item.id === selectedId);
                    if (selected) {
                      addTarget(targetType, selected.id, selected.label);
                      setSelectedId(targetType, '');
                    }
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  {WATCH_LIST_LABELS.addButton}
                </Button>
              </div>

              {typeTargets.length === 0 ? null : (
                <ul className="space-y-2">
                  {typeTargets.map((target) => (
                    <li
                      key={target.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {getWatchListTargetTypeLabel(target.targetType)}
                        </Badge>
                        <span className="truncate text-sm">{target.name}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        aria-label={`${WATCH_LIST_LABELS.removeButton} ${target.name}`}
                        onClick={() => removeTarget(target.targetType, target.targetId)}
                      >
                        <X size={14} className="mr-1" />
                        {WATCH_LIST_LABELS.removeButton}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WatchListSettings;
