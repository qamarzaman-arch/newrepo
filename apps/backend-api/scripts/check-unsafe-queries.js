#!/usr/bin/env node
/**
 * QA A87: forbid $queryRawUnsafe / $executeRawUnsafe outside an explicit
 * allowlist. These bypass Prisma's parameter binding and are a SQLi vector;
 * always prefer the tagged-template form ($queryRaw`SELECT ...`) which forces
 * placeholders.
 *
 * Allowlist file: apps/backend-api/scripts/.unsafe-query-allowlist
 *   (one path per line, blank lines and # comments allowed)
 *
 * Exits 1 on any disallowed match. Wire from husky pre-commit and CI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const ALLOWLIST = path.resolve(__dirname, '.unsafe-query-allowlist');
const PATTERN = /\$(query|execute)RawUnsafe\b/;

function readAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return new Set();
  return new Set(
    fs.readFileSync(ALLOWLIST, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
  );
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      yield* walk(full);
    } else if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
      yield full;
    }
  }
}

const allow = readAllowlist();
const violations = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
  if (allow.has(rel)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (PATTERN.test(line) && !/\/\/\s*allow-unsafe-query/.test(line)) {
      violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error('\n[check-unsafe-queries] Forbidden $queryRawUnsafe / $executeRawUnsafe usage:');
  for (const v of violations) console.error('  ' + v);
  console.error('\nUse the tagged-template form ($queryRaw`...`) which forces parameter binding.');
  console.error('If a call is genuinely safe, append `// allow-unsafe-query` on the same line');
  console.error('and add an explanation, or add the file to scripts/.unsafe-query-allowlist.\n');
  process.exit(1);
}

console.log('[check-unsafe-queries] OK — no unsafe raw queries found.');
