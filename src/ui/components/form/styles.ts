/**
 * Form suite styling contract.
 *
 * Values correspond to `docs/ui/design-system.md` §7 (`form` section).
 * The form input shares geometry and numeric handling with the data-table
 * number input — height, mono + `tabular-nums`, spinner removal — but keeps its
 * own surface: `rounded-md` + `border-input` + `bg-background` come from the
 * `ui/input` primitive, not from here.
 */

/** Height shared with the data-table number input; radius/surface stay the primitive's. */
export const fieldInputClass = 'h-[34px]';

/** Error affordance, driven by the injected `error` boolean from `FormControl`. */
export const fieldInputErrorClass = 'border-negative focus-visible:ring-negative';

/** Numeric fields: right-aligned, monospace, tabular figures. */
export const fieldNumberInputClass = 'text-right font-mono tabular-nums';
