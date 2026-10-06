import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

/** Maps a close command failure to the copy the surface shows. */
export const monthlyCloseErrorText = (err: unknown, fallback: string): string => {
  if (err instanceof MonthlyCloseCommandError) {
    if (err.code === MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED) {
      return MONTHLY_CLOSE_LABELS.STAGE_ALREADY_COMPLETED_ERROR;
    }
    if (err.code === MonthlyCloseCommandErrorCode.STAGE_NOT_WALK_POSITION) {
      return MONTHLY_CLOSE_LABELS.WALK_GUIDANCE;
    }
    if (err.code === MonthlyCloseCommandErrorCode.STAGES_INCOMPLETE) {
      return MONTHLY_CLOSE_LABELS.STAGES_INCOMPLETE_ERROR;
    }
    return `${fallback}（${err.code}）`;
  }
  return fallback;
};
