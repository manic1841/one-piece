import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePortfolioListController } from '@/ui/features/portfolio/hooks/usePortfolioListController';
import { type PortfolioListRowVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';

import PortfolioList from './PortfolioList';

vi.mock('@/ui/features/portfolio/hooks/usePortfolioListController');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseController = vi.mocked(usePortfolioListController);
const mockUseNavigate = vi.mocked(useNavigate);

const makeRow = (id: string, name: string): PortfolioListRowVM => ({
  id,
  name,
  securitiesName: `sec-${id}`,
  bankName: `bank-${id}`,
  valueText: 'NT$1,000',
  returnRate: 12.42,
  returnRateText: '12.42%',
  asOfText: '2026-09',
  isActive: true,
});

const rowA = makeRow('p1', 'Main Portfolio');
const rowB = makeRow('p2', 'Second Portfolio');

const makeController = (
  rows: PortfolioListRowVM[],
  overrides: Partial<ReturnType<typeof usePortfolioListController>> = {},
): ReturnType<typeof usePortfolioListController> =>
  ({
    loading: false,
    error: null,
    reload: vi.fn(),
    rows,
    overview: { totalValueText: 'NT$2,000' },
    accounts: [],
    reorderRows: vi.fn(),
    create: vi.fn(),
    isFormOpen: false,
    openForm: vi.fn(),
    closeForm: vi.fn(),
    ...overrides,
  }) as ReturnType<typeof usePortfolioListController>;

const setup = (rows: PortfolioListRowVM[], navigate = vi.fn()) => {
  const controller = makeController(rows);
  mockUseController.mockReturnValue(controller);
  mockUseNavigate.mockReturnValue(navigate);

  return {
    controller,
    navigate,
    ...render(
      <MemoryRouter>
        <PortfolioList />
      </MemoryRouter>,
    ),
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('PortfolioList', () => {
  it('renders Name | Securities | Bank | Portfolio Value | Return columns', () => {
    setup([rowA, rowB]);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Securities')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('Return')).toBeInTheDocument();
    expect(screen.getAllByText('Main Portfolio').length).toBe(2);
  });

  it('renders a loading status while the controller loads', () => {
    mockUseController.mockReturnValue(makeController([], { loading: true }));
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <PortfolioList />
      </MemoryRouter>,
    );

    expect(screen.getByText('載入投資組合中')).toBeInTheDocument();
  });

  it('renders the shared load-error copy with a retry', () => {
    const reload = vi.fn();
    mockUseController.mockReturnValue(
      makeController([], { error: '無法載入投資組合清單。', reload }),
    );
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <PortfolioList />
      </MemoryRouter>,
    );

    expect(screen.getByText('無法載入投資組合清單。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重試' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state when there are no rows', () => {
    setup([]);
    expect(screen.getByText('NO PORTFOLIOS')).toBeInTheDocument();
  });

  it('renders a grip handle on every row (desktop and mobile)', () => {
    setup([rowA, rowB]);

    const grips = screen.getAllByTestId('portfolio-grip-p1');
    expect(grips).toHaveLength(2);
    grips.forEach((grip) => {
      expect(grip.tagName).toBe('BUTTON');
      expect(grip.getAttribute('aria-label')).toContain('Main Portfolio');
    });
  });

  it('navigates to detail on row click while the grip is present', () => {
    const { navigate } = setup([rowA, rowB]);

    fireEvent.click(screen.getByTestId('portfolio-row-p1'));
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');

    navigate.mockClear();
    fireEvent.click(screen.getByTestId('portfolio-row-mobile-p1'));
    expect(navigate).toHaveBeenCalledWith('/portfolios/p1');
  });

  it('does not navigate when the grip handle itself is clicked', () => {
    const { navigate } = setup([rowA, rowB]);

    fireEvent.click(screen.getAllByTestId('portfolio-grip-p1')[0]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hands the new order to the controller after a keyboard drag', async () => {
    const { controller } = setup([rowA, rowB]);

    // jsdom reports zero rects; give the two desktop rows real geometry so
    // dnd-kit collision detection can resolve a drop target.
    const stubGeometry = (element: HTMLElement, top: number) => {
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 48,
        right: 400,
        width: 400,
        height: 48,
        toJSON: () => ({}),
      } as DOMRect);
    };
    stubGeometry(screen.getByTestId('portfolio-row-p1'), 0);
    stubGeometry(screen.getByTestId('portfolio-row-p2'), 48);

    fireEvent.keyDown(screen.getAllByTestId('portfolio-grip-p1')[0], { key: ' ', code: 'Space' });

    // KeyboardSensor attaches its document keydown listener in a setTimeout.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });

    const reorderRows = controller.reorderRows as ReturnType<typeof vi.fn>;
    expect(reorderRows).toHaveBeenCalledTimes(1);
    const ordered = reorderRows.mock.calls[0]?.[0] as PortfolioListRowVM[];
    expect(ordered.map((row) => row.id)).toEqual(['p2', 'p1']);
  });
});
