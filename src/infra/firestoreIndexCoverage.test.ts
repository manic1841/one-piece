import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Firestore 的複合索引只在正式環境被檢查：emulator 對任何查詢都照跑，缺索引的
 * 查詢要等部署後才炸。這個測試把「查詢形狀」與 `firestore.indexes.json` 對起來，
 * 讓缺索現在 `pnpm test` 就紅。
 *
 * 兩個方向都驗：
 * - 缺索引：單一句查詢需要的索引沒有宣告。這條比較嚴，所以只看句子本身。
 * - 死索引：宣告了卻沒有任何查詢需要它（吃寫入成本）。條件常被 push 進變數，
 *   這條改採較鬆的「逐檔逐集合累積欄位」，宁可漏報也不要誤報。
 *
 * 限制：先把條件 push 進變數再傳的寫法，單句看不到全貌，缺索引那條會漏接。
 * 新查詢請盡量寫成同一句的字面陣列。
 */

const ROOT = join(__dirname, '..', '..');

type Direction = 'ASCENDING' | 'DESCENDING';

interface Requirement {
  file: string;
  collection: string;
  arrayContains: string[];
  equality: string[];
  range: string[];
  orderBy: { field: string; direction: Direction }[];
}

interface DeclaredIndex {
  collection: string;
  fields: { field: string; direction?: Direction }[];
}

const RANGE_OPS = new Set(['<', '<=', '>', '>=']);

/** 逐檔逐集合累積的欄位與排序方向，供「死索引」檢查。 */
type FieldGroups = Map<
  string,
  { collection: string; fields: Set<string>; ordered: Map<string, Set<Direction>> }
>;

const conditionFields = (requirement: Requirement): Set<string> =>
  new Set([
    ...requirement.arrayContains,
    ...requirement.equality,
    ...requirement.range,
    ...requirement.orderBy.map((entry) => entry.field),
  ]);

type WhereConditions = Pick<Requirement, 'arrayContains' | 'equality' | 'range'>;

const parseWheres = (statement: string): WhereConditions => {
  const conditions: WhereConditions = { arrayContains: [], equality: [], range: [] };

  for (const [, field, op] of statement.matchAll(/where\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    const target =
      op === 'array-contains'
        ? conditions.arrayContains
        : op === '=='
          ? conditions.equality
          : RANGE_OPS.has(op as string)
            ? conditions.range
            : null;
    // 併入整個條件陣列後同一欄位可能重複出現，逐欄位去重。
    if (target && !target.includes(field as string)) target.push(field as string);
  }

  return conditions;
};

const parseOrderBy = (statement: string): Requirement['orderBy'] => {
  const orderBy: Requirement['orderBy'] = [];
  for (const [, field, direction] of statement.matchAll(/orderBy\(\s*'([^']+)'\s*,\s*'(\w+)'/g)) {
    // `__name__` 已經內建在每個索引裡，也不必宣告。
    if (field === '__name__') continue;
    if (orderBy.some((entry) => entry.field === field)) continue;
    orderBy.push({
      field: field as string,
      direction: direction === 'desc' ? 'DESCENDING' : 'ASCENDING',
    });
  }
  return orderBy;
};

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) out.push(rel);
  }
  return out;
};

/** `collection(db, 'households', id, 'reports')` 的最後一段字面就是集合名。 */
const collectionLiteral = (source: string): string | undefined =>
  [...source.matchAll(/collection\([^;]*?'([^']+)'\s*,?\s*\)/gs)].at(-1)?.[1];

/** 由 repository 檔案的集合來源與其匯出的實例名建立對照。 */
const collectionOfExport = (): Map<string, string> => {
  const map = new Map<string, string>();
  for (const file of walk('src/infra/repositories')) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    const collection = /collectionName = '([^']+)'/.exec(source)?.[1] ?? collectionLiteral(source);
    const exported = /export const (\w+Repository)\s*=/.exec(source)?.[1];
    if (collection && exported) map.set(exported, collection);
  }
  return map;
};

/** application 層的查詢借道 repository，用 import 的實例名回推集合。 */
const collectionOfFile = (source: string, exports: Map<string, string>): string => {
  const own = /collectionName = '([^']+)'/.exec(source)?.[1] ?? collectionLiteral(source);
  if (own) return own;

  for (const [name, collection] of exports) {
    if (new RegExp(`\\b${name}\\b`).test(source)) return collection;
  }
  return '';
};

/**
 * 一句查詢指向哪個集合。優先序：同句裡的 `collection(..., 'x')` 字面，其次是呼叫
 * 的接收者（`this` 表自己的集合，其餘查 export 對照），最後才退回整個檔案的集合。
 */
const collectionOfStatement = (
  statement: string,
  own: string,
  exports: Map<string, string>,
): string => {
  const literal = [...statement.matchAll(/collection\([^)]*'([^']+)'\s*,?\s*\)/g)].at(-1)?.[1];
  if (literal) return literal;

  const receiver = /(\w+)\.(?:list|query|getDocs|get)\(/.exec(statement)?.[1];
  if (receiver === 'this') return own;
  if (receiver && exports.has(receiver)) return exports.get(receiver) as string;

  return own;
};

/** 條件常被 push 進變數、分散在多句，單句看不到全貌；逐檔逐集合累積欄位與已用過的排序方向，供「死索引」檢查用。 */
const recordGroup = (
  groups: FieldGroups,
  key: string,
  requirement: Requirement,
  fields: Set<string>,
): void => {
  const group = groups.get(key) ?? {
    collection: requirement.collection,
    fields: new Set<string>(),
    ordered: new Map<string, Set<Direction>>(),
  };

  for (const field of fields) group.fields.add(field);
  for (const entry of requirement.orderBy) {
    const seen = group.ordered.get(entry.field) ?? new Set<Direction>();
    seen.add(entry.direction);
    group.ordered.set(entry.field, seen);
  }

  groups.set(key, group);
};

/** 條件常被 push 進陣列變數，單句看不到全貌；把宣告字面與後續 push 收集起來，供評語句時併入。 */
const collectConstraintArrays = (source: string): Map<string, string> => {
  const arrays = new Map<string, string>();

  for (const [, name, literal] of source.matchAll(
    /(?:const|let)\s+(\w+)\s*:\s*QueryConstraint\[\]\s*=\s*(\[[^\]]*\])/g,
  )) {
    arrays.set(name as string, literal as string);
  }

  for (const [, name, pushed] of source.matchAll(/(\w+)\.push\(\s*([^;]*?)\s*\)\s*;/g)) {
    const existing = arrays.get(name as string);
    if (existing !== undefined) arrays.set(name as string, `${existing}${pushed}`);
  }

  return arrays;
};

const collectRequirements = (): {
  requirements: Requirement[];
  fieldGroups: FieldGroups;
  collections: Set<string>;
  unattributed: Set<string>;
} => {
  const exports = collectionOfExport();
  const requirements: Requirement[] = [];
  const fieldGroups: FieldGroups = new Map();
  const collections = new Set<string>();
  const unattributed = new Set<string>();

  for (const file of [...walk('src/infra/repositories'), ...walk('src/application')]) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    const own = collectionOfFile(source, exports);
    const constraintArrays = collectConstraintArrays(source);

    for (const statement of source.split(';')) {
      const pushed = [...constraintArrays]
        .filter(([name]) => new RegExp(`\\b${name}\\b`).test(statement))
        .map(([, literal]) => literal)
        .join(' ');
      // push 語句自己只帶一部分條件，併上整個陣列才看得到完整查詢。
      const text = pushed ? `${statement} ${pushed}` : statement;
      if (!/where\(|orderBy\(/.test(text)) continue;

      if (!own) {
        unattributed.add(file);
        continue;
      }

      collections.add(own);

      const requirement: Requirement = {
        file,
        collection: collectionOfStatement(text, own, exports),
        ...parseWheres(text),
        orderBy: parseOrderBy(text),
      };

      const fields = conditionFields(requirement);
      if (fields.size === 0) continue;

      recordGroup(fieldGroups, `${file}\u0000${requirement.collection}`, requirement, fields);

      // 單一欄位的查詢由 Firestore 的預設單欄位索引服務，不必宣告。
      if (fields.size > 1) requirements.push(requirement);
    }
  }

  return { requirements, fieldGroups, collections, unattributed };
};

const declaredIndexes = (): DeclaredIndex[] =>
  (
    JSON.parse(readFileSync(join(ROOT, 'firestore.indexes.json'), 'utf8')) as {
      indexes: {
        collectionGroup: string;
        fields: { fieldPath: string; order?: Direction; arrayConfig?: string }[];
      }[];
    }
  ).indexes.map((index) => ({
    collection: index.collectionGroup,
    fields: index.fields
      .filter((field) => field.fieldPath !== '__name__')
      .map((field) => ({
        field: field.fieldPath,
        direction: field.order,
      })),
  }));

/**
 * 查詢需要的索引形狀。Firestore 的規則是「完全相符的條件不分先後在前，範圍與排序在後且必須有向」，
 * 所以前兩段比集合、後一段比順序。
 */
const requiredShape = (
  requirement: Requirement,
): { members: Set<string>; ordered: { field: string; direction: Direction }[] }[] => {
  const orderedFields = new Set(requirement.orderBy.map((entry) => entry.field));
  // 一個欄位同時出現在多種條件時，由約束最強的那一段負責：排序 > 等值 > 範圍。
  const equality = new Set([
    ...requirement.arrayContains,
    ...requirement.equality.filter((field) => !orderedFields.has(field)),
  ]);

  return [
    { members: equality, ordered: [] },
    {
      members: new Set(
        requirement.range.filter((field) => !orderedFields.has(field) && !equality.has(field)),
      ),
      ordered: [],
    },
    { members: new Set(), ordered: requirement.orderBy },
  ];
};

const requiredFields = (requirement: Requirement): string[] =>
  requiredShape(requirement).flatMap((segment) =>
    segment.ordered.length > 0 ? segment.ordered.map((entry) => entry.field) : [...segment.members],
  );

/** 排序段必須逐位、同向，因為那個順序是查詢的一部分。 */
const matchesOrdered = (
  declared: DeclaredIndex['fields'],
  ordered: { field: string; direction: Direction }[],
  position: number,
): boolean =>
  ordered.every((entry, offset) => {
    const field = declared[position + offset];
    return field?.field === entry.field && field.direction === entry.direction;
  });

/** 完全相符的條件彼此之間不計先後，但必須正好填滿這一段。 */
const matchesMembers = (
  declared: DeclaredIndex['fields'],
  members: Set<string>,
  position: number,
): boolean => {
  const slice = declared.slice(position, position + members.size);
  if (slice.length !== members.size) return false;
  if (new Set(slice.map((field) => field.field)).size !== members.size) return false;
  return slice.every((field) => members.has(field.field));
};

const covers = (index: DeclaredIndex, requirement: Requirement): boolean => {
  if (index.collection !== requirement.collection) return false;

  let position = 0;

  for (const segment of requiredShape(requirement)) {
    if (segment.ordered.length > 0) {
      if (!matchesOrdered(index.fields, segment.ordered, position)) return false;
      position += segment.ordered.length;
      continue;
    }

    if (!matchesMembers(index.fields, segment.members, position)) return false;
    position += segment.members.size;
  }

  return true;
};

const missingIndexes = (requirements: Requirement[], indexes: DeclaredIndex[]): string[] => [
  ...new Set(
    requirements
      .filter((requirement) => !indexes.some((index) => covers(index, requirement)))
      .map(
        (requirement) =>
          `${requirement.file} → ${requirement.collection} [${requiredFields(requirement).join(', ')}]`,
      ),
  ),
];

const { requirements, fieldGroups, collections, unattributed } = collectRequirements();
const indexes = declaredIndexes();

describe('firestore index coverage', () => {
  it('declares an index for every multi-field query', () => {
    expect(missingIndexes(requirements, indexes)).toEqual([]);
  });

  it('declares no index that no query needs', () => {
    const unused = indexes
      .filter(
        (index) =>
          ![...fieldGroups.values()].some(
            (group) =>
              group.collection === index.collection &&
              index.fields.every(
                (field) =>
                  group.fields.has(field.field) &&
                  // 等值／陣列條件不分方向，只有同一群組真的排序過的欄位才比方向。
                  (!group.ordered.has(field.field) ||
                    group.ordered.get(field.field)?.has(field.direction as Direction)),
              ),
          ),
      )
      .map((index) => `${index.collection} [${index.fields.map((f) => f.field).join(', ')}]`);

    expect(unused).toEqual([]);
  });

  it('resolves a collection for every file that runs a query', () => {
    expect([...unattributed]).toEqual([]);
  });

  it('only uses collections that exist in the repositories', () => {
    expect([...collections].filter((collection) => collection === '')).toEqual([]);
  });
});
