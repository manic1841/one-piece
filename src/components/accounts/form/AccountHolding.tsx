import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AccountSnapshotFormData } from '@/domains/account/types';
import type { Holding } from '@/schemas';

interface AccountHoldingProps {
  holdings: AccountSnapshotFormData['holdings'];
  onAddHolding: () => void;
  onRemoveHolding: (index: number) => void;
  onUpdateHolding: (index: number, field: keyof Holding, value: string) => void;
}

export const AccountHolding: React.FC<AccountHoldingProps> = ({
  holdings,
  onAddHolding,
  onRemoveHolding,
  onUpdateHolding,
}) => {
  return (
    <div className="space-y-3 border rounded-md p-4 bg-slate-50">
      <div className="flex justify-between items-center">
        <Label>Holdings</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddHolding}>
          <Plus className="h-4 w-4 mr-1" /> Add Holding
        </Button>
      </div>

      {holdings.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No holdings added. Total value will be 0.
        </p>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {holdings.map((holding, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-end border-b pb-2 last:border-0"
          >
            <div className="col-span-3">
              <Label className="text-xs">Symbol</Label>
              <Input
                value={holding.symbol}
                onChange={(e) => onUpdateHolding(index, 'symbol', e.target.value)}
                placeholder="AAPL"
                className="h-8"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Name</Label>
              <Input
                value={holding.name}
                onChange={(e) => onUpdateHolding(index, 'name', e.target.value)}
                placeholder="Apple Inc."
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                value={holding.quantity}
                onChange={(e) => onUpdateHolding(index, 'quantity', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={holding.marketValue}
                onChange={(e) => onUpdateHolding(index, 'marketValue', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Leverage</Label>
              <Input
                type="number"
                value={holding.leverage || ''}
                placeholder="1"
                onChange={(e) => onUpdateHolding(index, 'leverage', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive/90"
                onClick={() => onRemoveHolding(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
