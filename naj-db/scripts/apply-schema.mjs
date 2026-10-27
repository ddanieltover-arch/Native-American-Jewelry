#!/usr/bin/env node
/**
 * Apply Neon schema migrations (001 → 002 → optional 003 seed).
 * Usage: node scripts/apply-schema.mjs [--seed]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const withSeed = process.argv.includes('--seed');

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL or DATABASE_URL_DIRECT');
  process.exit(1);
}

const files = ['001_schema.sql', '002_functions.sql'];
if (withSeed) files.push('003_seed.sql');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  for (const name of files) {
    const file = path.join(root, 'migrations', name);
    const sql = fs.readFileSync(file, 'utf8');
    console.log(`Applying ${name}…`);
    await client.query(sql);
    console.log(`  OK ${name}`);
  }
  console.log('Schema apply complete.');
} finally {
  await client.end();
}
