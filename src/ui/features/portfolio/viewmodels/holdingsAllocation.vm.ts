/**
 * 持倉配置（見 CONTEXT.md）：把快照中的證券持倉依 symbol 彙總成兩張圓環的
 * 資料——市值加權與曝險加權。
 *
 * 幣別處理：`holding.marketValue` 是帳戶原幣金額，台幣的帳戶價值存在
 * `account.value`。因此以該帳戶的 `value` 為錨，按 `marketValue / ΣmarketValue`
 * 比例攤回每個持倉；台幣帳戶（比例為 1）自然退化為直接加總。
 */
import { AccountCategory } from '@/domains/account/types/categories';
import { type Portfolio, type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { type DonutSegment } from '@/ui/components/charts/DonutChart';
import { PORTFOLIO_ALLOCATION_LABELS } from '@/ui/constants/portfolio/labels';
import { formatCurrency } from '@/ui/utils';

import { EMPTY_TEXT, isPortfolioActive } from './portfolioVm';

/** 前 N 名各成一片，其餘合併為「其他」。 */
const TOP_N = 7;

interface SymbolTotals {
  symbol: string;
  /** 台幣市值。 */
  marketValue: number;
  /** 台幣曝險（市值 × 槓桿）。 */
  exposure: number;
}

export interface HoldingsAllocationVM {
  hasData: boolean;
  marketSegments: DonutSegment[];
  exposureSegments: DonutSegment[];
  /** 圓環中心標籤（台幣總額）。無資料時為 —。 */
  marketTotalText: string;
  exposureTotalText: string;
}

const toSymbolTotals = (snapshot: PortfolioSnapshot | undefined): SymbolTotals[] => {
  if (!snapshot) return [];

  const totals: SymbolTotals[] = [];
  for (const account of snapshot.accounts ?? []) {
    // 只有證券帳戶帶持倉；銀行／現金帳戶不列入配置。
    if (account.category !== AccountCategory.SECURITIES) continue;

    const holdings = account.holdings ?? [];
    const sumMarketValue = holdings.reduce(
      (sum, holding) => sum + Math.max(0, holding.marketValue ?? 0),
      0,
    );
    if (sumMarketValue <= 0) continue;

    // 台幣錨：把帳戶的原幣持倉換算為台幣（台幣帳戶時 scale 為 1）。
    const scale = Math.max(0, account.value ?? 0) / sumMarketValue;
    for (const holding of holdings) {
      const value = Math.max(0, holding.marketValue ?? 0) * scale;
      if (value <= 0) continue;
      totals.push({
        symbol: holding.symbol,
        marketValue: value,
        exposure: value * (holding.leverage ?? 1),
      });
    }
  }
  return totals;
};

const aggregateBySymbol = (totals: SymbolTotals[]): SymbolTotals[] => {
  const bySymbol = new Map<string, SymbolTotals>();
  for (const total of totals) {
    const existing = bySymbol.get(total.symbol);
    if (existing) {
      existing.marketValue += total.marketValue;
      existing.exposure += total.exposure;
    } else {
      bySymbol.set(total.symbol, { ...total });
    }
  }
  return [...bySymbol.values()];
};

/** 依市值排序，取前 N 名，其餘摺疊為單一「其他」片；順序即顏色順序。 */
const buildCanonical = (totals: SymbolTotals[]): SymbolTotals[] => {
  const sorted = [...totals].sort(
    (a, b) => b.marketValue - a.marketValue || a.symbol.localeCompare(b.symbol),
  );
  if (sorted.length <= TOP_N) return sorted;

  const head = sorted.slice(0, TOP_N);
  const tail = sorted.slice(TOP_N);
  head.push({
    symbol: PORTFOLIO_ALLOCATION_LABELS.OTHER,
    marketValue: tail.reduce((sum, item) => sum + item.marketValue, 0),
    exposure: tail.reduce((sum, item) => sum + item.exposure, 0),
  });
  return head;
};

const buildAllocationVM = (totals: SymbolTotals[]): HoldingsAllocationVM => {
  const canonical = buildCanonical(aggregateBySymbol(totals));
  const totalMarketValue = canonical.reduce((sum, item) => sum + item.marketValue, 0);
  const totalExposure = canonical.reduce((sum, item) => sum + item.exposure, 0);
  const hasData = totalMarketValue > 0;

  return {
    hasData,
    // 兩張圓環共用同一 canonical 順序，顏色（依 index）因此對齊。
    marketSegments: canonical.map((item) => ({ label: item.symbol, value: item.marketValue })),
    exposureSegments: canonical.map((item) => ({ label: item.symbol, value: item.exposure })),
    marketTotalText: hasData ? formatCurrency(totalMarketValue) : EMPTY_TEXT,
    exposureTotalText: hasData ? formatCurrency(totalExposure) : EMPTY_TEXT,
  };
};

/** 明細頁：單一組合最新快照的持倉配置。 */
export const buildPortfolioAllocationVM = (
  snapshot: PortfolioSnapshot | undefined,
): HoldingsAllocationVM => buildAllocationVM(toSymbolTotals(snapshot));

/**
 * 列表頁：家庭級彙總——各組合各取最新快照後合併（可能混時點），
 * 只計 active 組合（與列表總額一致）。
 */
export const buildAggregateAllocationVM = (
  portfolios: readonly Portfolio[],
  latestSnapshots: Map<string, PortfolioSnapshot>,
): HoldingsAllocationVM =>
  buildAllocationVM(
    portfolios
      .filter(isPortfolioActive)
      .flatMap((portfolio) => toSymbolTotals(latestSnapshots.get(portfolio.id))),
  );
