#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const neonUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const source = process.env.SUPABASE_DB_URL;

if (!neonUrl) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const tables = [
  'categories',
  'products',
  'product_images',
  'product_variants',
  'customers',
  'orders',
  'order_items',
  'payments',
  'admin_users',
  'shipping_rates',
  'coupons',
  'scrape_logs',
  'newsletter_subscribers',
];

async function counts(url, label) {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const out = {};
  try {
    for (const t of tables) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
        out[t] = rows[0].c;
      } catch {
        out[t] = 'missing';
      }
    }
  } finally {
    await client.end();
  }
  console.log(`\n=== ${label} ===`);
  for (const t of tables) console.log(`${t.padEnd(28)} ${out[t]}`);
  return out;
}

const neon = await counts(neonUrl, 'Neon');
if (source) {
  const sb = await counts(source, 'Supabase');
  console.log('\n=== Diff (Neon - Supabase) ===');
  for (const t of tables) {
    if (typeof neon[t] === 'number' && typeof sb[t] === 'number') {
      const d = neon[t] - sb[t];
      console.log(`${t.padEnd(28)} ${d === 0 ? 'OK' : d}`);
    }
  }
}
