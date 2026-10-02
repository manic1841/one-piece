import React from 'react';

import { ActivityList, ActivityRow } from '@/ui/components/ActivityList';
import CompactRow from '@/ui/components/CompactRow';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  NumberCell,
  NumberInput,
  parseOptionalAmount,
} from '@/ui/components/data-table';
import { GripHandle, SortableListScope } from '@/ui/components/sortable/SortableListScope';
import { TableBody, TableHeader } from '@/ui/components/ui/table';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import { cn } from '@/ui/utils/cn';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

/**
 * Collection surfaces: five ways to present a set of rows. Kept adjacent so the
 * read-only / activity / editable / sortable / mobile roles compare directly.
 */

const SAMPLE_TABLE_ROWS = [
  {
    id: 't-1',
    date: 'SEP 18',
    description: 'Salary Received',
    account: 'Main Bank',
    amount: '+NT$85,000',
    tone: 'positive' as const,
  },
  {
    id: 't-2',
    date: 'SEP 17',
    description: 'ETF Purchase',
    account: 'Brokerage',
    amount: '-NT$20,000',
    tone: 'negative' as const,
  },
  {
    id: 't-3',
    date: 'SEP 16',
    description: 'Dividend Received',
    account: 'Brokerage',
    amount: '+NT$8,420',
    tone: 'positive' as const,
  },
];

const DataTableSection: React.FC = () => (
  <GallerySection number="08" title="Data Table">
    <GalleryModule label="TRANSACTIONS">
      <DataTableScrollArea className="hidden md:block">
        <DataTable>
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>DATE</DataTableHeadCell>
              <DataTableHeadCell>DESCRIPTION</DataTableHeadCell>
              <DataTableHeadCell>ACCOUNT</DataTableHeadCell>
              <DataTableHeadCell align="number">AMOUNT</DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_TABLE_ROWS.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell>{row.date}</DataTableCell>
                <DataTableCell>{row.description}</DataTableCell>
                <DataTableCell>{row.account}</DataTableCell>
                <DataTableCell
                  align="number"
                  className={row.tone === 'positive' ? 'text-positive' : 'text-negative'}
                >
                  {row.amount}
                </DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
      <MobileDataList className="md:hidden">
        {SAMPLE_TABLE_ROWS.map((row) => (
          <MobileDataRow key={row.id}>
            <MobileDataField label="DATE">{row.date}</MobileDataField>
            <MobileDataField label="DESCRIPTION">{row.description}</MobileDataField>
            <MobileDataField label="AMOUNT">
              <span className="font-mono tabular-nums">{row.amount}</span>
            </MobileDataField>
          </MobileDataRow>
        ))}
      </MobileDataList>
    </GalleryModule>
    <GalleryCaption>
      唯讀的結構化紀錄：表頭 + 明確欄寬（總和 100%），供掃描與跨表比較。行動版改走 grouped card。
    </GalleryCaption>
  </GallerySection>
);

const BALANCE_WIDTHS = [40, 20, 20, 20] as const;

const BALANCE_ROWS = [
  { id: 'b1', account: 'Main Bank', ledger: 1242000 },
  { id: 'b2', account: 'Brokerage', ledger: 4811600 },
  { id: 'b3', account: 'Credit Card', ledger: -42300 },
];

const formatTWD = (value: number): string => `NT$${value.toLocaleString('en-US')}`;

const DataTablePrimitivesSection: React.FC = () => {
  const [ending, setEnding] = React.useState<Record<string, string>>({
    b1: '1242000',
    b2: '4811000',
    b3: '',
  });

  return (
    <GallerySection number="09" title="Data Table Primitives">
      <GalleryModule label="ACCOUNT BALANCES (EDITABLE ENDING)">
        <DataTableScrollArea>
          <DataTable>
            <DataTableColGroup widths={BALANCE_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell>ACCOUNT</DataTableHeadCell>
                <DataTableHeadCell align="number">LEDGER</DataTableHeadCell>
                <DataTableHeadCell align="number">ENDING</DataTableHeadCell>
                <DataTableHeadCell align="number">DIFF</DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              {BALANCE_ROWS.map((row) => {
                const value = parseOptionalAmount(ending[row.id] ?? '');
                const diff = value === undefined ? undefined : value - row.ledger;
                return (
                  <DataTableRow key={row.id}>
                    <DataTableCell>{row.account}</DataTableCell>
                    <NumberCell value={row.ledger} format={formatTWD} />
                    <DataTableCell align="number">
                      <NumberInput
                        value={ending[row.id] ?? ''}
                        onChange={(event) =>
                          setEnding((prev) => ({ ...prev, [row.id]: event.target.value }))
                        }
                        aria-label={`Ending balance for ${row.account}`}
                        className="w-full"
                      />
                    </DataTableCell>
                    <NumberCell
                      value={diff}
                      format={formatTWD}
                      className={cn(
                        diff === undefined
                          ? undefined
                          : diff === 0
                            ? 'text-muted-foreground'
                            : 'text-destructive',
                      )}
                    />
                  </DataTableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </DataTableScrollArea>
      </GalleryModule>
      <GalleryCaption>
        與 08 同一套件，差別在可編輯：NumberInput 是對帳中表格的核心。DataTableColGroup
        宣告欄寬（總和必須 100%）· NumberCell 右對齊等寬、空值顯示「—」。
      </GalleryCaption>
    </GallerySection>
  );
};

const ActivitySection: React.FC = () => (
  <GallerySection number="10" title="Activity List">
    <GalleryModule label="RECENT ACTIVITY">
      <ActivityList>
        <ActivityRow
          date="SEP 18"
          title="Salary Received"
          meta="Main Bank"
          amount="+NT$85,000"
          tone="positive"
        />
        <ActivityRow
          date="SEP 17"
          title="ETF Purchase"
          meta="Brokerage"
          amount="-NT$20,000"
          tone="negative"
        />
        <ActivityRow
          date="SEP 16"
          title="Dividend Received"
          meta="Brokerage"
          amount="+NT$8,420"
          tone="positive"
        />
      </ActivityList>
    </GalleryModule>
    <GalleryCaption>
      不是表格：無表頭、無欄寬，只有 date / title+meta / amount 三段式列。回答「最近發生什麼」，是低
      優先的系統日誌，不做欄位對齊。
    </GalleryCaption>
  </GallerySection>
);

interface SortableAccount {
  id: string;
  name: string;
  balance: string;
}

const SORTABLE_INITIAL: SortableAccount[] = [
  { id: 's1', name: 'Main Bank', balance: 'NT$1,242,000' },
  { id: 's2', name: 'Brokerage', balance: 'NT$4,811,600' },
  { id: 's3', name: 'Credit Card', balance: '-NT$42,300' },
];

const SortableAccountRow: React.FC<{ row: SortableAccount }> = ({ row }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging, rowStyle } =
    useSortableRow(row.id);

  return (
    <li
      ref={setNodeRef}
      style={rowStyle}
      className={cn(
        'flex items-center gap-3 border-b border-border py-3',
        isDragging && 'bg-muted/50 opacity-50',
      )}
    >
      <GripHandle
        label={`Reorder ${row.name}`}
        attributes={attributes}
        listeners={listeners}
        activatorRef={setActivatorNodeRef}
      />
      <span className="flex-1 text-sm">{row.name}</span>
      <span className="font-mono text-sm tabular-nums">{row.balance}</span>
    </li>
  );
};

const SortableSection: React.FC = () => {
  const [items, setItems] = React.useState<SortableAccount[]>(SORTABLE_INITIAL);

  return (
    <GallerySection number="11" title="Sortable List">
      <GalleryModule label="REORDER · DRAG THE GRIP, OR SPACE / ARROWS / SPACE">
        <ul className="border-t border-border">
          <SortableListScope items={items} onReorder={setItems}>
            {items.map((row) => (
              <SortableAccountRow key={row.id} row={row} />
            ))}
          </SortableListScope>
        </ul>
      </GalleryModule>
      <GalleryCaption>
        回答「順序怎麼排」：僅 grip 可拖曳，整列點擊導覽不受干擾；三感應器為 Pointer 8px / Touch
        180ms / Keyboard。規範來源：design-system `sortable-list`（ADR-0059）。
      </GalleryCaption>
    </GallerySection>
  );
};

const CompactRowSection: React.FC = () => (
  <GallerySection number="12" title="Compact Row">
    <GalleryModule label="MOBILE ROW · FORCED VISIBLE">
      <CompactRow
        testId="gallery-compact-row"
        onClick={() => {}}
        style={{ display: 'block' }}
        className="bg-card/50"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Main Bank</p>
            <p className="font-mono text-[11px] text-muted-foreground">CASH</p>
          </div>
          <span className="font-mono text-sm tabular-nums">NT$1,242,000</span>
        </div>
      </CompactRow>
    </GalleryModule>
    <GalleryCaption>
      集合的<strong>行動版</strong>列：`&lt;md` 時取代桌面表格列（`md:hidden`），單列
      label／值對齊。 此處強制顯示以便檢視。
    </GalleryCaption>
  </GallerySection>
);

export const GalleryCollectionsBody: React.FC = () => (
  <>
    <GalleryGroup label="COLLECTIONS" />
    <DataTableSection />
    <DataTablePrimitivesSection />
    <ActivitySection />
    <SortableSection />
    <CompactRowSection />
  </>
);
