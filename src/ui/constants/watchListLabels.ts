import { type WatchListTargetType } from '@/domains/watch_list/schemas';

/**
 * Single source of display wording for the watch list management card.
 * Domain schemas carry only data semantics (ADR-0046 pattern); every user-facing
 * string for this card lives here.
 */
export const WATCH_LIST_TARGET_TYPE_LABELS: Record<WatchListTargetType, string> = {
  PROJECT: '專案',
  LEDGER_CODE: '會計科目',
  DEBT_ACCOUNT: '債務帳戶',
};

export const WATCH_LIST_LABELS = {
  cardTitle: '監看清單',
  cardDescription: '標記參與記帳完整性檢查的對象（結算前檢查用）。',
  addButton: '加入監看',
  removeButton: '移除',
  emptyMessage: '尚未監看任何對象。',
  addTargetLabel: '新增監看對象',
} as const;

export const getWatchListTargetTypeLabel = (targetType: WatchListTargetType): string =>
  WATCH_LIST_TARGET_TYPE_LABELS[targetType];
