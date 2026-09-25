import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TableBody, TableHeader } from '@/ui/components/ui/table';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableRow,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  NumberCell,
  NumberInput,
  dataTableCellNumberClass,
  dataTableCellTextClass,
  numberInputClass,
} from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

/** 從 class 常數取出 `h-[NNpx]` / `py-[NNpx]` 的像素值。 */
const px = (className: string, pattern: RegExp): number => Number(className.match(pattern)?.[1]);

describe('row height contract', () => {
  it('keeps the 54px row height even when a cell holds a 34px input', () => {
    // `h-[54px]` 只是最小列高。列內最高的內容是數字輸入框，因此
    // 「輸入框高 + 上下內距 + 1px 分隔線」不得超過 54px，否則輸入列會被撐開
    // （13px 內距的實測值是 61px）。少掉的內距對純文字列沒有視覺影響，
    // 那些列本來就由最小列高撐滿。
    const ROW_HEIGHT = 54;
    const DIVIDER = 1;
    const inputHeight = px(numberInputClass, /h-\[(\d+(?:\.\d+)?)px\]/);

    expect(inputHeight).toBe(34);

    for (const cellClass of [dataTableCellTextClass, dataTableCellNumberClass]) {
      const verticalPadding = px(cellClass, /py-\[(\d+(?:\.\d+)?)px\]/);
      expect(inputHeight + verticalPadding * 2 + DIVIDER).toBeLessThanOrEqual(ROW_HEIGHT);
    }
  });
});

describe('DataTable', () => {
  it('applies the fixed-layout contract (table-fixed + border-collapse)', () => {
    render(
      <DataTable data-testid="table">
        <TableBody>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const table = screen.getByTestId('table');
    expect(table.className).toContain('table-fixed');
    expect(table.className).toContain('border-collapse');
  });
});

describe('DataTableColGroup', () => {
  it('renders one col per width with percentage widths', () => {
    const { container } = render(
      <DataTable>
        <DataTableColGroup widths={[25, 25, 50]} />
        <TableBody>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const cols = container.querySelectorAll('col');
    expect(cols).toHaveLength(3);
    expect(cols[0]).toHaveStyle({ width: '25%' });
    expect(cols[2]).toHaveStyle({ width: '50%' });
  });

  it('does not warn when the widths sum to 100', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <DataTable>
        <DataTableColGroup widths={[14, 22, 14, 50]} />
        <TableBody>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('warns when the widths do not sum to 100', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <DataTable>
        <DataTableColGroup widths={[20, 20]} />
        <TableBody>
          <DataTableRow>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain('must sum to 100');
  });
});

describe('DataTableHeadCell', () => {
  it('right-aligns number headers so they share the axis with the data below', () => {
    render(
      <DataTable>
        <TableHeader>
          <DataTableRow>
            <DataTableHeadCell>Account</DataTableHeadCell>
            <DataTableHeadCell align="number">Ending Balance</DataTableHeadCell>
          </DataTableRow>
        </TableHeader>
      </DataTable>,
    );

    const textHead = screen.getByText('Account');
    const numberHead = screen.getByText('Ending Balance');
    expect(textHead.className).toContain('text-left');
    expect(textHead.className).toContain('uppercase');
    expect(textHead.className).toContain('align-bottom');
    expect(numberHead.className).toContain('text-right');
    expect(textHead.className).not.toContain('text-right');
  });
});

describe('DataTableCell', () => {
  it('applies the 13px vertical padding and middle alignment', () => {
    render(
      <DataTable>
        <TableBody>
          <DataTableRow>
            <DataTableCell>plain</DataTableCell>
            <DataTableCell align="number">1,000</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const plain = screen.getByText('plain');
    const numeric = screen.getByText('1,000');
    expect(plain.className).toContain('align-middle');
    expect(plain.className).toContain('py-[9px]');
    expect(numeric.className).toContain('font-mono');
    expect(numeric.className).toContain('tabular-nums');
    expect(numeric.className).toContain('text-right');
  });
});

describe('DataTableRow', () => {
  it('does not show hover feedback by default (non-clickable rows must not fake clickability)', () => {
    render(
      <DataTable>
        <TableBody>
          <DataTableRow data-testid="row">
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const row = screen.getByTestId('row');
    expect(row.className).not.toContain('hover:bg-muted/50');
    expect(row).not.toHaveAttribute('data-interactive');
  });

  it('shows hover feedback only when marked interactive', () => {
    render(
      <DataTable>
        <TableBody>
          <DataTableRow data-testid="row" interactive onClick={() => {}}>
            <DataTableCell>a</DataTableCell>
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const row = screen.getByTestId('row');
    expect(row.className).toContain('hover:bg-muted/50');
    expect(row.className).toContain('cursor-pointer');
    expect(row).toHaveAttribute('data-interactive');
  });
});

describe('NumberCell', () => {
  it('renders the formatted value right-aligned', () => {
    render(
      <DataTable>
        <TableBody>
          <DataTableRow>
            <NumberCell value={52000} format={(v) => `$${v.toLocaleString('en-US')}`} />
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    const cell = screen.getByText('$52,000');
    expect(cell.className).toContain('text-right');
    expect(cell.className).toContain('tabular-nums');
  });

  it('renders an em dash for null and undefined', () => {
    render(
      <DataTable>
        <TableBody>
          <DataTableRow>
            <NumberCell data-testid="null-cell" value={null} />
            <NumberCell data-testid="undefined-cell" value={undefined} />
          </DataTableRow>
        </TableBody>
      </DataTable>,
    );

    expect(screen.getByTestId('null-cell')).toHaveTextContent('—');
    expect(screen.getByTestId('undefined-cell')).toHaveTextContent('—');
  });
});

describe('NumberInput', () => {
  it('removes the native spinner and right-aligns mono numerics', () => {
    render(<NumberInput aria-label="ending" defaultValue={100} />);

    const input = screen.getByLabelText('ending');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input.className).toContain('appearance:textfield');
    expect(input.className).toContain('tabular-nums');
    expect(input.className).toContain('text-right');
    expect(input.className).toContain('h-[34px]');
  });

  it('uses the 32px height for compact (sub-table) inputs', () => {
    render(<NumberInput aria-label="cost" compact defaultValue={1} />);

    const input = screen.getByLabelText('cost');
    expect(input.className).toContain('h-8');
    expect(input.className).toContain('text-xs');
  });
});

describe('MobileDataList', () => {
  it('is hidden from md upwards and lays fields out label-left / value-right', () => {
    render(
      <MobileDataList data-testid="list">
        <MobileDataRow>
          <MobileDataField label="前期餘額">$50,000</MobileDataField>
        </MobileDataRow>
      </MobileDataList>,
    );

    expect(screen.getByTestId('list').className).toContain('md:hidden');
    const field = screen.getByText('前期餘額').parentElement;
    expect(field?.className).toContain('justify-between');
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });
});
