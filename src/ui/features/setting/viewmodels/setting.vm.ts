/**
 * The setting feature's ViewModel tier — the only bridge through which its
 * Surface files reach domain shapes and values (ADR-0062). Re-exports only;
 * mapping logic lives in the feature's hooks.
 */
export { RoleEnum } from '@/domains/household/role';
export type { Household } from '@/domains/household/schemas';

export { LEDGER_PREFIX } from '@/domains/ledger/constants/ledgerCodes';

export { WATCH_LIST_TARGET_TYPES } from '@/domains/watch_list/schemas';
export type { WatchListTarget, WatchListTargetType } from '@/domains/watch_list/schemas';

export type { Project } from '@/domains/project/schemas';
