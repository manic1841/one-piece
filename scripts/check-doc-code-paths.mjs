#!/usr/bin/env node
// Fails if a permanent doc points at a repo path that does not exist.
//
// Relative markdown links are already covered by check-doc-references.sh. A
// backticked path is the other way docs point at code, and it is the one that
// rots silently: renaming a folder left three dead `src/...` citations in place
// because only links were verified.
//
// A token counts as a path when its first segment is a real top-level entry of
// the repository, so root files (`package.json`) are covered as well as nested
// ones (`src/...`, `docs/...`) without a hardcoded allow-list to drift. A bare
// name like `types.ts` or `ui/table` is a doc-relative reference and is left to
// the writers — resolving those would need to guess which of several roots was
// meant. A path carrying a placeholder segment (`{domain}`, `<feature>`, `*`,
// `...`) names a shape rather than a location and is skipped. A line carrying
// `docs:check-ignore` is skipped too, for paths cited on purpose as historical.
//
// Usage: check-doc-code-paths.mjs [path ...] (same target rules as
// check-doc-references.sh).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const TOKEN = /`([A-Za-z.][\w./<>{}*…-]*)`/g;
const PLACEHOLDER = /[<>{}*…]|\.\.\./;
const IGNORE = 'docs:check-ignore';
const TOP_LEVEL = new Set(readdirSync('.'));

const targets =
  process.argv.length > 2 ? process.argv.slice(2) : ['docs', 'CONTEXT.md', 'AGENTS.md'];

function markdownUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...markdownUnder(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = [];
for (const target of targets) {
  if (!existsSync(target)) {
    console.error(`docs:check: path not found: ${target}`);
    process.exit(2);
  }
  files.push(...(statSync(target).isDirectory() ? markdownUnder(target) : [target]));
}

const dead = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes(IGNORE)) return;
    for (const [, raw] of line.matchAll(TOKEN)) {
      if (PLACEHOLDER.test(raw) || raw.includes(':')) continue;
      // A trailing slash means "the folder"; the folder itself is what has to exist.
      const path = raw.replace(/^\.\//, '').replace(/\/$/, '');
      if (path === '') continue;
      if (!TOP_LEVEL.has(path.split('/')[0])) continue;
      if (existsSync(path)) continue;
      dead.push(`${file}:${index + 1}: dead code path -> ${path}`);
    }
  });
}

if (dead.length > 0) {
  console.error('Permanent docs must not cite paths that do not exist:');
  console.error(dead.join('\n'));
  process.exit(1);
}

console.log('docs:check code paths OK');
