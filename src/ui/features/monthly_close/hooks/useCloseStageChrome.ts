import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

interface UseCloseStageChromeArgs {
  confirming: boolean;
  isReviewing?: boolean;
  isConfirmable: boolean;
}

/**
 * Shared chrome logic for every close step: the confirm-bar action label and
 * the confirm button's enabled state. The layout (CloseStageChrome) renders
 * one copy of the markup every step shares.
 */
export const useCloseStageChrome = ({
  confirming,
  isReviewing = false,
  isConfirmable,
}: UseCloseStageChromeArgs): {
  actionLabel: string;
  canConfirm: boolean;
} => ({
  actionLabel: confirming
    ? MONTHLY_CLOSE_LABELS.LOADING
    : isReviewing
      ? MONTHLY_CLOSE_LABELS.RECONFIRM_ACTION
      : MONTHLY_CLOSE_LABELS.CONTINUE,
  canConfirm: !confirming && isConfirmable,
});
