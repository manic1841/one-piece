/**
 * `tabs` 表面常數（單一真相來源）。
 *
 * 底線式觸發區的基底只收斂與狀態無關的 token；選中態修飾由消費端掛在各自的狀態
 * 屬性上（`data-[state=active]` 或 `aria-pressed`），避免兩處各寫一份而漂移。
 */

/** 底線式觸發區基底：無底色、直角，2px 透明底線以 `-mb-px` 咬住 1px 細線。 */
export const tabTriggerBaseClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm border-b-2 border-transparent bg-transparent px-1 pb-2 pt-1 -mb-px text-sm font-medium text-muted-foreground ring-offset-background transition-colors duration-fast ease-out-quint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50';
