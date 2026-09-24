import { Edit2, Plus, Power, Shield } from 'lucide-react';

import { LEDGER_PREFIX } from '@/domains/ledger/constants/ledgerCodes';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { useLedgerCodeSettings } from '@/ui/features/setting/hooks/useLedgerCodeSettings';

export const LedgerCodeSettings = () => {
  const {
    groupedRows,
    loading,
    newLabel,
    setNewLabel,
    newCode,
    setNewCode,
    newType,
    setNewType,
    editingCode,
    editValue,
    setEditValue,
    isSubmitting,
    error,
    handleAdd,
    handleToggleActive,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useLedgerCodeSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            Ledger Code Settings
          </CardTitle>
          <CardDescription>Manage accounting categories for your transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive rounded-lg border border-destructive/40 bg-destructive/10 p-3"
            >
              {error}
            </p>
          )}

          {/* New Code Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAdd();
            }}
            className="space-y-4 p-4 bg-muted/30 rounded-lg border"
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Plus size={16} /> Add Custom Category or Detail
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value={LEDGER_PREFIX.ASSET}>Asset (資產)</option>
                  <option value={LEDGER_PREFIX.LIABILITY}>Liability (負債)</option>
                  <option value={LEDGER_PREFIX.INCOME}>Income (收入)</option>
                  <option value={LEDGER_PREFIX.EXPENSE}>Expense (支出)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>科目代碼 (Slug)</Label>
                <Input
                  placeholder="property 或 property:taipei"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                />
                <p className="text-[10px] text-muted-foreground leading-snug">
                  <span className="font-mono">category</span> 建立科目；
                  <span className="font-mono">category:detail</span> 在既有 category 底下建立明細科目。
                </p>
              </div>
              <div className="space-y-2">
                <Label>Display Name (Label)</Label>
                <Input
                  placeholder="e.g. 差旅費"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                  {isSubmitting ? 'Adding...' : 'Add Category'}
                </Button>
              </div>
            </div>
          </form>

          {/* Grouped Lists */}
          <div className="space-y-8">
            {Object.entries(groupedRows).map(([type, rows]) => (
              <div key={type} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary pl-3">
                  {type} Categories
                </h3>
                <div className="border rounded-lg overflow-hidden divide-y bg-card">
                  {rows.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm italic">
                      No categories defined for this type.
                    </div>
                  )}
                  {rows.map(({ item, isDetail, parentLabel }) => (
                    <div
                      key={item.code}
                      className={`p-4 flex items-center justify-between group hover:bg-muted/50 transition-colors ${
                        isDetail ? 'pl-10 bg-muted/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          {editingCode === item.code ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 w-48 text-sm"
                                autoFocus
                              />
                              <Button size="sm" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">
                                {isDetail && parentLabel
                                  ? `${parentLabel} › ${item.label}`
                                  : item.label}
                              </p>
                              {item.isCustom && (
                                <button
                                  onClick={() => startEdit(item.code, item.label)}
                                  className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit capitalize">
                            {item.code}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!item.isCustom ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px] uppercase font-bold"
                          >
                            <Shield size={10} /> System
                          </Badge>
                        ) : (
                          <Button
                            variant={item.isActive ? 'outline' : 'ghost'}
                            size="sm"
                            className={`h-8 gap-1.5 ${item.isActive ? 'text-positive hover:text-positive' : 'text-muted-foreground'}`}
                            onClick={() => handleToggleActive(item)}
                          >
                            <Power size={14} />
                            {item.isActive ? 'Active' : 'Disabled'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
