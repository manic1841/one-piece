import React from 'react';

import { Plus, Trash2 } from 'lucide-react';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataList,
  MobileDataRow,
  NumberInput,
  TableBody,
  TableHeader,
  dataTableLabelClass,
  parseOptionalAmount,
  textInputCompactClass,
} from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { ACCOUNT_BALANCE_FIELD_LABELS } from '@/ui/constants/monthlyClose';
import { cn } from '@/ui/utils/cn';

import type { Account, AccountBalanceInput, Holding } from '../../../viewmodels/accountBalance.vm';
import {
  holdingsMarketValueText,
  securitiesTwdValueText,
} from '../../../viewmodels/accountBalance.vm';

/** 欄寬契約：總和必須等於 100（Symbol/Name/Cost/Value/Leverage 均分 + actions 7%）。 */
const SECURITIES_COLUMN_WIDTHS = [18.6, 18.6, 18.6, 18.6, 18.6, 7] as const;

const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface SecuritiesAccountRowProps {
  entry: {
    account: Account;
    canImportPrevious: boolean;
  };
  input: AccountBalanceInput | undefined;
  previousHoldings: Holding[];
  /** Closed periods render read-only: holdings become plain data and actions are hidden. */
  isReadOnly: boolean;
  onHoldingsChange: (accountId: string, holdings: Holding[]) => void;
  onRateChange: (accountId: string, value: number | undefined) => void;
}

export const SecuritiesAccountRow: React.FC<SecuritiesAccountRowProps> = ({
  entry,
  input,
  previousHoldings,
  isReadOnly,
  onHoldingsChange,
  onRateChange,
}) => {
  const holdings = input?.holdings ?? [];
  const isForeign = entry.account.currency !== 'TWD';
  const canImport = !isReadOnly && entry.canImportPrevious && previousHoldings.length > 0;

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
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={SECURITIES_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell className="pl-3">Symbol</DataTableHeadCell>
                  <DataTableHeadCell className="pl-3">Name</DataTableHeadCell>
                  <DataTableHeadCell align="number" className="pl-3">
                    Cost
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number" className="pl-3">
                    Value
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number" className="pl-3">
                    Leverage
                  </DataTableHeadCell>
                  {!isReadOnly && <DataTableHeadCell aria-label="actions" />}
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding, index) => (
                  <DataTableRow key={index}>
                    <DataTableCell className="pl-3">
                      <Input
                        aria-label={`Symbol ${index + 1}`}
                        className={textInputCompactClass}
                        disabled={isReadOnly}
                        value={holding.symbol}
                        onChange={(event) => updateHolding(index, 'symbol', event.target.value)}
                      />
                    </DataTableCell>
                    <DataTableCell className="pl-3">
                      <Input
                        aria-label={`Name ${index + 1}`}
                        className={textInputCompactClass}
                        disabled={isReadOnly}
                        value={holding.name}
                        onChange={(event) => updateHolding(index, 'name', event.target.value)}
                      />
                    </DataTableCell>
                    <DataTableCell className="pl-3">
                      <NumberInput
                        aria-label={`Cost ${index + 1}`}
                        compact
                        className="w-full"
                        disabled={isReadOnly}
                        value={holding.cost}
                        onChange={(event) => updateHolding(index, 'cost', event.target.value)}
                      />
                    </DataTableCell>
                    <DataTableCell className="pl-3">
                      <NumberInput
                        aria-label={`Value ${index + 1}`}
                        compact
                        className="w-full"
                        disabled={isReadOnly}
                        value={holding.marketValue}
                        onChange={(event) =>
                          updateHolding(index, 'marketValue', event.target.value)
                        }
                      />
                    </DataTableCell>
                    <DataTableCell className="pl-3">
                      <NumberInput
                        aria-label={`Leverage ${index + 1}`}
                        compact
                        step="0.01"
                        placeholder="1"
                        className="w-full"
                        disabled={isReadOnly}
                        value={holding.leverage ?? ''}
                        onChange={(event) => updateHolding(index, 'leverage', event.target.value)}
                      />
                    </DataTableCell>
                    {!isReadOnly && (
                      <DataTableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeHolding(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    )}
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>

          <MobileDataList>
            {holdings.map((holding, index) => (
              <MobileDataRow key={index} className="space-y-2 border-border/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {holding.symbol || `持倉 ${index + 1}`} · {holding.name}
                  </p>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeHolding(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className={dataTableLabelClass}>Cost</p>
                    <NumberInput
                      aria-label={`Cost ${index + 1}`}
                      compact
                      disabled={isReadOnly}
                      value={holding.cost}
                      onChange={(event) => updateHolding(index, 'cost', event.target.value)}
                    />
                  </div>
                  <div>
                    <p className={dataTableLabelClass}>Value</p>
                    <NumberInput
                      aria-label={`Value ${index + 1}`}
                      compact
                      disabled={isReadOnly}
                      value={holding.marketValue}
                      onChange={(event) => updateHolding(index, 'marketValue', event.target.value)}
                    />
                  </div>
                  <div>
                    <p className={dataTableLabelClass}>Leverage</p>
                    <NumberInput
                      aria-label={`Leverage ${index + 1}`}
                      compact
                      step="0.01"
                      placeholder="1"
                      disabled={isReadOnly}
                      value={holding.leverage ?? ''}
                      onChange={(event) => updateHolding(index, 'leverage', event.target.value)}
                    />
                  </div>
                </div>
              </MobileDataRow>
            ))}
          </MobileDataList>
        </>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(!isReadOnly ? undefined : 'invisible')}
          tabIndex={isReadOnly ? -1 : 0}
          disabled={isReadOnly}
          onClick={addHolding}
        >
          <Plus className="mr-1 h-4 w-4" /> 新增持倉
        </Button>
        <div className="text-right">
          <p className={dataTableLabelClass}>市值</p>
          <p className="font-mono text-sm font-medium tabular-nums text-foreground">
            {holdingsMarketValueText(input)}
          </p>
        </div>
      </div>
      {isForeign && (
        <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-3 md:justify-end md:gap-6">
          <div className="space-y-1 md:text-right">
            <p className={dataTableLabelClass}>{ACCOUNT_BALANCE_FIELD_LABELS.EXCHANGE_RATE}</p>
            <Label htmlFor={`sec-rate-${entry.account.id}`} className="sr-only">
              {ACCOUNT_BALANCE_FIELD_LABELS.EXCHANGE_RATE} {entry.account.name}
            </Label>
            <NumberInput
              id={`sec-rate-${entry.account.id}`}
              step="0.0001"
              className="w-28 md:ml-auto"
              disabled={isReadOnly}
              value={input?.exchangeRate ?? ''}
              onChange={(event) =>
                onRateChange(entry.account.id, parseOptionalAmount(event.target.value))
              }
            />
          </div>
          <div className="text-right">
            <p className={dataTableLabelClass}>{ACCOUNT_BALANCE_FIELD_LABELS.TWD_VALUE}</p>
            <p
              data-testid={`twd-value-${entry.account.id}`}
              className="font-mono text-sm font-medium tabular-nums text-foreground"
            >
              {securitiesTwdValueText(input)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
