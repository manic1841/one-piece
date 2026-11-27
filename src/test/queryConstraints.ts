import { type QueryConstraint } from 'firebase/firestore';

/**
 * 讀取 `QueryConstraint` 的內容。
 *
 * Firebase SDK 只把條件放在私有欄位（`_limit`、`_field`、`_direction`），沒有公開
 * 的取值方式，所以測試直接碰這些欄位；集中在這裡，SDK 改名時只要改一處。
 */
interface ConstraintInternals {
  type: string;
  _limit?: number;
  _field?: { segments?: string[] } | string;
  _op?: string;
  _direction?: string;
}

const internals = (constraint: QueryConstraint): ConstraintInternals =>
  constraint as unknown as ConstraintInternals;

export const limitOf = (constraint: QueryConstraint): number | undefined =>
  internals(constraint)._limit;

export const fieldOf = (constraint: QueryConstraint): string | undefined => {
  const field = internals(constraint)._field;
  if (typeof field === 'string') return field;
  return field?.segments?.join('.');
};

export const directionOf = (constraint: QueryConstraint): string | undefined =>
  internals(constraint)._direction;
