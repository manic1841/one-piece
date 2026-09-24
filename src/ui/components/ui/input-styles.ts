/**
 * Styling fragments shared across input surfaces.
 *
 * `numberInputSpinnerClass` removes the native number-input spinner. It is the
 * only fragment shared between the general form inputs (`components/form`) and
 * the data-table number input (`components/data-table`) — the two suites keep
 * their own surface (height/radius/background); only the geometry-adjacent
 * spinner removal is common. See `docs/ui/design-system.md` §7.
 */
export const numberInputSpinnerClass =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
