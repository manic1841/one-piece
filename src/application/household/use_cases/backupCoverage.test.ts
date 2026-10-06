import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Household backup coverage contract (issue #256).
 *
 * Collection names have no central registry: repositories declare private
 * `collectionName` fields and a few call sites inline the name, so the scan
 * is static (as in `layer-boundary.test.ts`). Exclusion sets below mirror
 * the design exclusions documented in the development guide's backup section.
 */
const USE_CASES_DIR = path.resolve(__dirname);
const SRC_DIR = path.resolve(USE_CASES_DIR, '..', '..', '..');

const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

const EXPORT_FILE = path.join(USE_CASES_DIR, 'exportHouseholdBackupUseCase.ts');
const RESTORE_OPS_FILE = path.join(USE_CASES_DIR, 'householdBackupRestoreOps.ts');

/** DB collection name -> backup payload key. Absent = identity mapping. */
const PAYLOAD_KEY_BY_DB_NAME: Record<string, string> = {
  retirement_plans: 'retirementPlans',
  intent_mappings: 'intentMappings',
};

/** Collections intentionally outside the backup. */
const EXCLUDED_DB_NAMES = new Set(['operations', 'users', 'access_control', 'households']);

/** Subcollections embedded inside their parent payload key, not backed up separately. */
const EMBEDDED_SUBCOLLECTIONS = new Set(['snapshots', 'incomeStreams', 'expenseCategories']);

const collectSourceFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) return collectSourceFiles(entryPath);
    if (TEST_FILE_PATTERN.test(entry) || !SOURCE_FILE_PATTERN.test(entry)) return [];
    return [entryPath];
  });
};

/** Reads `src/` and returns every Firestore collection name referenced in code. */
const scannedCollectionNames = (): Set<string> => {
  const names = new Set<string>();
  for (const file of collectSourceFiles(SRC_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/collectionName\s*=\s*['"]([^'"]+)['"]/g)) {
      names.add(match[1]);
    }
    for (const match of source.matchAll(/collection\s*\(\s*(?:this\.)?db\s*,([^)]*)\)/g)) {
      for (const segment of match[1].matchAll(/['"]([^'"]+)['"]/g)) {
        names.add(segment[1]);
      }
    }
  }
  return names;
};

const payloadKeyOf = (dbName: string): string => PAYLOAD_KEY_BY_DB_NAME[dbName] ?? dbName;

/** Scanned names reduced to backup payload keys via the explicit exclusion sets. */
const scannedPayloadKeys = (): Set<string> => {
  const keys = new Set<string>();
  for (const name of scannedCollectionNames()) {
    if (EXCLUDED_DB_NAMES.has(name) || EMBEDDED_SUBCOLLECTIONS.has(name)) continue;
    keys.add(payloadKeyOf(name));
  }
  return keys;
};

/**
 * Depth-aware member parser for an object-literal body: splits members at
 * depth zero, then judges each `key: type` or a bare shorthand identifier.
 * Used for both the payload type's `collections` block and the export
 * return's `collections` literal, so the two contract surfaces parse the
 * same way.
 */
const literalBlockKeys = (block: string): string[] => {
  const keys: string[] = [];
  const depthChars = ['<', '{', '(', '['];
  const closers = ['>', '}', ')', ']'];
  let memberStart = 0;
  let memberDepth = 0;
  for (let i = 0; i <= block.length; i++) {
    const ch = block[i];
    if (depthChars.includes(ch)) {
      memberDepth++;
      continue;
    }
    if (closers.includes(ch)) {
      memberDepth--;
      continue;
    }
    const isSeparator = (ch === ',' || ch === ';') && memberDepth === 0;
    if (isSeparator || i === block.length) {
      const member = block.slice(memberStart, i).trim();
      const keyed = member.match(/^(\w+)\s*:/);
      if (keyed) {
        keys.push(keyed[1]);
      } else if (/^\w+$/.test(member)) {
        keys.push(member);
      }
      memberStart = i + 1;
    }
  }
  return keys;
};

/** Finds the body of a balanced `{ ... }` block opening at `open`. */
const balancedBlockBody = (source: string, open: number): string => {
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return source.slice(open + 1, end);
};

/** Payload keys of the `HouseholdBackupPayload` type (the contract surface). */
const payloadTypeKeys = (): Set<string> => {
  const source = readFileSync(EXPORT_FILE, 'utf8');
  const collectionsLiteral = source.indexOf('collections: {');
  return new Set([
    'household',
    ...literalBlockKeys(balancedBlockBody(source, source.indexOf('{', collectionsLiteral))),
  ]);
};

/** Payload keys the export body actually emits (from the `return` object literal). */
const exportBodyKeys = (): Set<string> => {
  const source = readFileSync(EXPORT_FILE, 'utf8');
  const collectionsLiteral = source.indexOf('collections: {', source.indexOf('async execute'));
  return new Set([
    'household',
    ...literalBlockKeys(balancedBlockBody(source, source.indexOf('{', collectionsLiteral))),
  ]);
};

/** Payload keys the restore (delete + set) actually touches. */
const restoreTouchedKeys = (): Set<string> => {
  const source = readFileSync(RESTORE_OPS_FILE, 'utf8');
  const buildDeleteRefsStart = source.indexOf('export const buildDeleteRefs');
  const buildSetOpsStart = source.indexOf('export const buildSetOps');
  const touched = new Set<string>();
  for (const start of [buildDeleteRefsStart, buildSetOpsStart]) {
    const body = source.slice(start, buildSetOpsStart > start ? buildSetOpsStart : undefined);
    for (const match of body.matchAll(/households\/\$\{householdId\}\/(\w+)/g)) {
      const name = match[1];
      if (EXCLUDED_DB_NAMES.has(name) || EMBEDDED_SUBCOLLECTIONS.has(name)) continue;
      touched.add(payloadKeyOf(name));
    }
  }
  return touched;
};

describe('household backup coverage contract (issue #256)', () => {
  it('scanner finds the known household collections', () => {
    const scanned = scannedCollectionNames();
    expect(
      ['accounts', 'transactions', 'retirement_plans', 'financialPeriods'].every((name) =>
        scanned.has(name),
      ),
      `scanner missed known collections; found: ${[...scanned].sort().join(', ')}`,
    ).toBe(true);
  });

  it('backup payload covers every household collection referenced in src', () => {
    const scanned = scannedPayloadKeys();
    const payload = payloadTypeKeys();
    payload.delete('household');
    const missingFromPayload = [...scanned].filter((key) => !payload.has(key)).sort();
    const unreferencedKeys = [...payload].filter((key) => !scanned.has(key)).sort();
    expect(
      { missingFromPayload, unreferencedKeys },
      `Scanned collections and backup payload keys must match. Collections missing from the ` +
        `backup payload: ${missingFromPayload.join(', ') || '(none)'}. Payload keys no ` +
        `collection references: ${unreferencedKeys.join(', ') || '(none)'}.`,
    ).toEqual({ missingFromPayload: [], unreferencedKeys: [] });
  });

  it('export body emits every payload key', () => {
    const payload = payloadTypeKeys();
    const emitted = exportBodyKeys();
    const missing = [...payload].filter((key) => !emitted.has(key)).sort();
    const extra = [...emitted].filter((key) => !payload.has(key)).sort();
    expect(
      { missing, extra },
      `Export body must emit every payload key. Missing: ${missing.join(', ') || '(none)'}. ` +
        `Emitted but not in payload type: ${extra.join(', ') || '(none)'}.`,
    ).toEqual({ missing: [], extra: [] });
  });

  it('restore touches every payload key', () => {
    const payload = payloadTypeKeys();
    payload.delete('household');
    const touched = restoreTouchedKeys();
    const untouched = [...payload].filter((key) => !touched.has(key)).sort();
    expect(
      untouched,
      `Restore must read and write every backed-up collection. Untouched: ` +
        `${untouched.join(', ') || '(none)'}.`,
    ).toEqual([]);
  });
});
