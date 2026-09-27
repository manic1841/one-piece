/**
 * One-time CLI: upgrade the live v0-era household backup JSON to the current
 * era so the app's import path can restore it (issue: live backup upgrade).
 *
 * Reads the backup file, applies the pure transform in
 * upgrade-household-backup.ts (household memberUids, portfolio named links,
 * hand-computed v1 retirement plan), and writes a new JSON file. The input
 * file is left untouched; the original backup remains the downgrade path.
 *
 * Usage: npx tsx scripts/admin/upgrade-household-backup.ts <input.json> <output.json>
 * Restore: import the output file via the app's backup import (owner/admin).
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { type HouseholdBackupPayload } from '../../src/application/household/use_cases/exportHouseholdBackupUseCase';
import { upgradeHouseholdBackup } from './upgrade-household-backup';

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error(
    'Usage: npx tsx scripts/admin/upgrade-household-backup.ts <input.json> <output.json>',
  );
  process.exit(1);
}

const payload = JSON.parse(readFileSync(inputPath, 'utf8')) as HouseholdBackupPayload;

if (payload.schemaVersion !== 1) {
  console.error(`Unsupported backup schemaVersion: ${payload.schemaVersion}`);
  process.exit(1);
}

const upgraded = upgradeHouseholdBackup(payload);
writeFileSync(outputPath, `${JSON.stringify(upgraded, null, 2)}\n`, 'utf8');

const collections = upgraded.collections;
console.log(`Upgraded backup written to ${outputPath}`);
console.log(
  `  household memberUids: ${(upgraded.household as Record<string, unknown>).memberUids?.length ?? 0}`,
);
console.log(`  portfolios with named links: ${collections.portfolios.length}`);
console.log(`  retirement plans: ${collections.retirementPlans.length}`);
console.log(`  transactions: ${collections.transactions.length}`);
