import React from 'react';

import { Plus, Trash2 } from 'lucide-react';

import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, Holding } from '@/domains/account/types/account';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Button } from '@/ui/components/ui/button';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { formatCurrency } from '@/ui/utils';

import { computeSectionInput } from '../viewmodels/accountBalance.vm';

const sectionLabelClass =
  'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground';

const numericColumns = ['Cost', 'Value', 'Leverage'];

const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface SecuritiesAccountRowProps {
  entry: {
    account: Account;
    verified: boolean;
    canImportPrevious: boolean;
  };
  input: AccountBalanceInput | undefined;
  previousHoldings: Holding[];
  onHoldingsChange: (accountId: string, holdings: Holding[]) => void;
  onRateChange: (accountId: string, value: number | undefined) => void;
}

export const SecuritiesAccountRow: React.FC<SecuritiesAccountRowProps> = ({
  entry,
  input,
  previousHoldings,
  onHoldingsChange,
  onRateChange,
}) => {
  const holdings = input?.holdings ?? [];
  const isForeign = entry.account.currency !== 'TWD';
  const holdingsSum = holdings.reduce((sum, holding) => sum + (holding.marketValue || 0), 0);
  const twdValue = input ? computeSectionInput(input, 'securities') : 0;
  const canImport = !entry.verified && previousHoldings.length > 0;

  const updateHolding = (index: number, field: keyof Holding, value: string): void => {
    const numeric = ['cost', 'marketValue', 'leverage'].includes(field);
    const next = [...holdings];
    next[index] = { ...next[index], [field]: numeric ? toNumber(value) : value };
    onHoldingsChange(entry.account.id, next);
  };

  const addHolding = (): void => {
    onHoldingsChange(entry.account.id, [
      ...holdings,
      { symbol: '', name: '', cost: 0, marketValue: 0 },
    ]);
  };

  const removeHolding = (index: number): void => {
    onHoldingsChange(
      entry.account.id,
      holdings.filter((_, idx) => idx !== index),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">{entry.account.name}</div>
        <div className="flex items-center gap-3">
          {entry.verified ? (
            <StatusGlyph type="verified" label="VERIFIED" />
          ) : (
            <StatusGlyph type="waiting" label="WAITING" />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canImport}
            onClick={() => onHoldingsChange(entry.account.id, [...previousHoldings])}
          >
            匯入上月持倉
          </Button>
        </div>
      </div>

      {holdings.length === 0 ? (
        <p className="text-xs text-muted-foreground">尚無持倉，市值為 0。</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Symbol', 'Name', 'Cost', 'Value', 'Leverage'].map((label) => (
                    <th
                      key={label}
                      className={`py-1 font-semibold ${
                        numericColumns.includes(label) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                  <th className="py-1" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Symbol ${index + 1}`}
                        className="h-8 w-24 text-xs"
                        value={holding.symbol}
                        onChange={(event) => updateHolding(index, 'symbol', event.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Name ${index + 1}`}
                        className="h-8 w-36 text-xs"
                        value={holding.name}
                        onChange={(event) => updateHolding(index, 'name', event.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Cost ${index + 1}`}
                        type="number"
                        inputMode="decimal"
                        className="ml-auto h-8 w-28 text-right font-mono text-xs tabular-nums"
                        value={holding.cost}
                        onChange={(event) => updateHolding(index, 'cost', event.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Value ${index + 1}`}
                        type="number"
                        inputMode="decimal"
                        className="ml-auto h-8 w-28 text-right font-mono text-xs tabular-nums"
                        value={holding.marketValue}
                        onChange={(event) => updateHolding(index, 'marketValue', event.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Leverage ${index + 1}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        className="ml-auto h-8 w-20 text-right font-mono text-xs tabular-nums"
                        placeholder="1"
                        value={holding.leverage ?? ''}
                        onChange={(event) => updateHolding(index, 'leverage', event.target.value)}
                      />
                    </td>
                    <td className="py-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeHolding(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {holdings.map((holding, index) => (
              <div key={index} className="space-y-2 border-t border-border/60 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {holding.symbol || `持倉 ${index + 1}`} · {holding.name}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeHolding(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className={sectionLabelClass}>Cost</p>
                    <Input
                      aria-label={`Cost ${index + 1}`}
                      type="number"
                      inputMode="decimal"
                      className="h-8 text-right font-mono text-xs tabular-nums"
                      value={holding.cost}
                      onChange={(event) => updateHolding(index, 'cost', event.target.value)}
                    />
                  </div>
                  <div>
                    <p className={sectionLabelClass}>Value</p>
                    <Input
                      aria-label={`Value ${index + 1}`}
                      type="number"
                      inputMode="decimal"
                      className="h-8 text-right font-mono text-xs tabular-nums"
                      value={holding.marketValue}
                      onChange={(event) => updateHolding(index, 'marketValue', event.target.value)}
                    />
                  </div>
                  <div>
                    <p className={sectionLabelClass}>Leverage</p>
                    <Input
                      aria-label={`Leverage ${index + 1}`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="h-8 text-right font-mono text-xs tabular-nums"
                      placeholder="1"
                      value={holding.leverage ?? ''}
                      onChange={(event) => updateHolding(index, 'leverage', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={addHolding}>
          <Plus className="mr-1 h-4 w-4" /> 新增持倉
        </Button>
        <div>
          <p className={`${sectionLabelClass} text-right`}>市值</p>
          <p className="font-mono text-sm font-medium tabular-nums text-foreground">
            {formatCurrency(holdingsSum)}
          </p>
        </div>
      </div>

      {isForeign && (
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 md:justify-end">
          <div className="space-y-1">
            <p className={sectionLabelClass}>匯率</p>
            <Label htmlFor={`sec-rate-${entry.account.id}`} className="sr-only">
              匯率 {entry.account.name}
            </Label>
            <Input
              id={`sec-rate-${entry.account.id}`}
              type="number"
              inputMode="decimal"
              step="0.0001"
              className="w-28 text-right font-mono tabular-nums"
              value={input?.exchangeRate ?? ''}
              onChange={(event) =>
                onRateChange(
                  entry.account.id,
                  event.target.value === '' ? undefined : Number(event.target.value),
                )
              }
            />
          </div>
          <div>
            <p className={`${sectionLabelClass} text-right`}>TWD 價值</p>
            <p
              data-testid={`twd-value-${entry.account.id}`}
              className="font-mono text-sm font-medium tabular-nums text-foreground"
            >
              {formatCurrency(twdValue)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
