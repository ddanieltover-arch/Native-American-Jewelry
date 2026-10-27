#!/usr/bin/env node
/**
 * Dump public schema data from Supabase Postgres → restore into Neon.
 *
 * Requires `pg_dump` and `psql` on PATH.
 * Pause the scraper before running.
 *
 * Usage: node scripts/migrate-pg.mjs
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const source = process.env.SUPABASE_DB_URL;
const dest = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!source || !dest) {
  console.error('Set SUPABASE_DB_URL and DATABASE_URL (or DATABASE_URL_DIRECT)');
  process.exit(1);
}

const dumpFile = path.join(os.tmpdir(), `naj-public-${Date.now()}.sql`);

console.log('Dumping public schema data from Supabase…');
const dump = spawnSync(
  'pg_dump',
  [
    '--data-only',
    '--no-owner',
    '--no-acl',
    '--schema=public',
    '--disable-triggers',
    source,
    '-f',
    dumpFile,
  ],
  { stdio: 'inherit', shell: true }
);

if (dump.status !== 0) {
  console.error('pg_dump failed. Ensure pg_dump is installed and SUPABASE_DB_URL is correct.');
  process.exit(dump.status ?? 1);
}

console.log('Restoring into Neon…');
const restore = spawnSync('psql', [dest, '-v', 'ON_ERROR_STOP=1', '-f', dumpFile], {
  stdio: 'inherit',
  shell: true,
});

try {
  fs.unlinkSync(dumpFile);
} catch {
  /* ignore */
}

if (restore.status !== 0) {
  console.error('psql restore failed.');
  process.exit(restore.status ?? 1);
}

console.log('Postgres data migration complete. Run: npm run verify-counts');
