import { type WatchListTargetType } from '@/domains/watch_list/schemas';
import { getWatchListTargetTypeLabel } from '@/ui/constants/watchListLabels';

/**
 * Single source of display wording for the settlement completeness soft gate
 * (ADR-0046/ADR-0048). Wording must not claim the user missed an entry: zero
 * activity only means "nothing was found for the target month". Debt accounts
 * are measured by DEBT_PAYMENT transactions (ADR-0048 decision 2), so their
 * row names repayments rather than generic activity. Target-type names delegate
 * to the watch list label map rather than a second copy
 * (ui-labeling-guideline: extend the existing map, do not duplicate it).
 */
export const COMPLETENESS_LABELS = {
  gateTitle: '結算前完整性檢查',
  gateDescription: '以下監看對象在結算月份沒有找到活動，請逐一確認後再繼續。',
  activityHint: (count: number, amount: number) =>
    `當月活動：${count} 筆，合計 ${amount.toLocaleString('zh-TW')}`,
  repaymentHint: '當月沒有找到還款紀錄',
  confirmButton: '確認無漏記',
  confirmAllBlocked: '請先逐項確認後再繼續',
  checkFailed: '完整性檢查無法完成，可繼續結算；建議稍後再確認。',
} as const;

export const getCompletenessTargetLabel = (targetType: WatchListTargetType): string =>
  getWatchListTargetTypeLabel(targetType);
