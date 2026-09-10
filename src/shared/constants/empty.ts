export const NO_SELECTED = 'NO_SELECTED';

export const nullOrData = (value: unknown): unknown => {
  if (value === NO_SELECTED) {
    return null;
  }
  return value;
};
