#!/usr/bin/env node
/**
 * Copy Supabase Storage objects → Cloudflare R2 and rewrite URL columns on Neon.
 *
 * Buckets: product-images, payment-proofs
 * Keys on R2: product-images/<path>, payment-proofs/<path>
 *
 * Usage: node scripts/migrate-storage.mjs
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import pg from 'pg';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const neonUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKey = process.env.R2_ACCESS_KEY_ID;
const secretKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');

if (!supabaseUrl || !serviceKey || !neonUrl || !accountId || !accessKey || !secretKey || !bucket || !publicBase) {
  console.error('Missing env: SUPABASE_*, DATABASE_URL*, R2_*');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
});

const oldPublicPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public`;

async function listAll(bucketName, prefix = '') {
  const keys = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // folders have id null and no metadata in some API versions
      if (item.id === null && !item.metadata) {
        const nested = await listAll(bucketName, full);
        keys.push(...nested);
      } else {
        keys.push(full);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return keys;
}

async function copyBucket(bucketName) {
  console.log(`Listing ${bucketName}…`);
  const keys = await listAll(bucketName);
  console.log(`  ${keys.length} objects`);
  let ok = 0;
  for (const key of keys) {
    const { data, error } = await supabase.storage.from(bucketName).download(key);
    if (error || !data) {
      console.warn('  skip download', key, error?.message);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const r2Key = `${bucketName}/${key}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: buf,
        ContentType: data.type || 'application/octet-stream',
      })
    );
    ok++;
    if (ok % 25 === 0) console.log(`  uploaded ${ok}/${keys.length}`);
  }
  console.log(`  done ${bucketName}: ${ok} uploaded`);
  return ok;
}

await copyBucket('product-images');
await copyBucket('payment-proofs');

const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const img = await client.query(
    `UPDATE product_images
     SET url = REPLACE(url, $1, $2)
     WHERE url LIKE $3
     RETURNING id`,
    [oldPublicPrefix, publicBase, `${oldPublicPrefix}%`]
  );
  console.log(`Rewrote ${img.rowCount} product_images.url rows`);

  const pay = await client.query(
    `UPDATE payments
     SET proof_url = REPLACE(proof_url, $1, $2)
     WHERE proof_url LIKE $3
     RETURNING id`,
    [oldPublicPrefix, publicBase, `${oldPublicPrefix}%`]
  );
  console.log(`Rewrote ${pay.rowCount} payments.proof_url rows`);

  // Also map /object/public/product-images/X → /product-images/X style if publicBase already includes host
  await client.query(
    `UPDATE product_images
     SET url = REPLACE(url, $1 || '/product-images/', $2 || '/product-images/')
     WHERE url LIKE $1 || '%'`,
    [oldPublicPrefix, publicBase]
  );
} finally {
  await client.end();
}

console.log('Storage migration complete.');
