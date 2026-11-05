/**
 * Live demo backup exporter (CLI).
 *
 * Writes `schemaVersion: 2` backup JSON for a live household from the
 * deterministic QA plan. Import the file in the live demo household through
 * the app's own restore path; see docs/qa-seed-data.md §6.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { buildDemoBackupPayload } from './demoBackup';

interface Args {
  householdId: string;
  uid: string;
  email: string;
  out: string;
  name: string;
  force: boolean;
  dryRun: boolean;
}

const USAGE = `Usage:
  pnpm demo:backup -- --household <householdId> --uid <ownerUid> --email <ownerEmail> [options]

Options:
  --out <path>    output file (default: examples/demo-backup.json)
  --name <name>   household name written into the backup (default: Demo Family)
  --force         overwrite an existing output file
  --dry-run       build and validate only, write nothing`;

const parseArgs = (argv: string[]): Args => {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    // pnpm forwards the literal `--` separator; it carries no meaning here.
    if (arg === '--') continue;
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (key === 'force' || key === 'dry-run') {
      flags.add(key);
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    values.set(key, value);
    i += 1;
  }

  const householdId = values.get('household');
  const uid = values.get('uid');
  const email = values.get('email');
  if (!householdId || !uid || !email)
    throw new Error('--household, --uid and --email are required');

  return {
    householdId,
    uid,
    email,
    // examples/ is gitignored: the file carries live uids, emails and balances.
    out: values.get('out') ?? 'examples/demo-backup.json',
    name: values.get('name') ?? 'Demo Family',
    force: flags.has('force'),
    dryRun: flags.has('dry-run'),
  };
};

// Same serialization the app uses: Dates leave as ISO and the import schema
// revives them.
const serialize = (payload: unknown) =>
  JSON.stringify(
    payload,
    (_key, value) => (value instanceof Date ? value.toISOString() : value),
    2,
  );

const main = () => {
  const args = parseArgs(process.argv.slice(2));

  if (existsSync(args.out) && !args.force && !args.dryRun) {
    throw new Error(`${args.out} already exists. Pass --force to overwrite.`);
  }

  const payload = buildDemoBackupPayload({
    householdId: args.householdId,
    uid: args.uid,
    email: args.email,
    householdName: args.name,
  });

  const summary = Object.entries(payload.collections)
    .map(([key, value]) => `${key}: ${(value as unknown[]).length}`)
    .join(', ');
  console.log(`Built plan for household ${args.householdId}: ${summary}`);

  if (args.dryRun) {
    console.log('Dry run: nothing written.');
    return;
  }

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${serialize(payload)}\n`);
  console.log(`Wrote ${args.out}`);
  console.log('Import it in the live demo household: /settings/backup → 還原備份.');
};

try {
  main();
} catch (error) {
  console.error(`demo:backup failed: ${(error as Error).message}`);
  console.error(USAGE);
  process.exit(1);
}
