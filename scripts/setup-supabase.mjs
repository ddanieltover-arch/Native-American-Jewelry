/**
 * Verifies Supabase connection and seeds sample products if the catalog is empty.
 * Run: node scripts/setup-supabase.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

loadEnv(join(root, 'naj-storefront', '.env.local'));

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in naj-storefront/.env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SAMPLE_PRODUCTS = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    name: 'Navajo Turquoise Squash Blossom Necklace',
    slug: 'navajo-turquoise-squash-blossom-necklace',
    description: 'Handcrafted sterling silver squash blossom necklace featuring natural Kingman turquoise.',
    category_id: '11111111-0000-0000-0000-000000000001',
    source_price: 420,
    price: 399,
    tags: ['turquoise', 'navajo', 'necklace'],
    in_stock: true,
    stock_quantity: 5,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1515566662555-4e8f83fa4b44?w=800&q=80',
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    name: 'Zuni Petit Point Turquoise Ring',
    slug: 'zuni-petit-point-turquoise-ring',
    description: 'Delicate Zuni petit point inlay ring set in sterling silver.',
    category_id: '11111111-0000-0000-0000-000000000002',
    source_price: 285,
    price: 270.75,
    tags: ['turquoise', 'zuni', 'ring'],
    in_stock: true,
    stock_quantity: 8,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b35585?w=800&q=80',
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    name: 'Hopi Overlay Silver Cuff Bracelet',
    slug: 'hopi-overlay-silver-cuff-bracelet',
    description: 'Traditional Hopi overlay technique cuff in heavy-gauge sterling silver.',
    category_id: '11111111-0000-0000-0000-000000000003',
    source_price: 350,
    price: 332.5,
    tags: ['hopi', 'bracelet', 'silver'],
    in_stock: true,
    stock_quantity: 3,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfacacb3c?w=800&q=80',
  },
];

async function main() {
  console.log('Connecting to', url);

  const { error: catErr } = await supabase.from('categories').select('id').limit(1);
  if (catErr) {
    console.error('\nDatabase tables not found. Run migrations in Supabase SQL Editor:');
    console.error('  naj-supabase-integration/migrations/001_schema.sql');
    console.error('  naj-supabase-integration/migrations/002_seed.sql');
    console.error('  naj-supabase-integration/migrations/003_functions.sql');
    console.error('\nError:', catErr.message);
    process.exit(1);
  }

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  console.log(`Active products: ${count ?? 0}`);

  if ((count ?? 0) > 0) {
    console.log('Catalog already has products — skipping seed.');
    return;
  }

  console.log('Seeding sample products...');

  const categories = [
    { id: '11111111-0000-0000-0000-000000000001', name: 'Necklaces', slug: 'necklaces', featured: true, sort_order: 1 },
    { id: '11111111-0000-0000-0000-000000000002', name: 'Rings', slug: 'rings', featured: true, sort_order: 2 },
    { id: '11111111-0000-0000-0000-000000000003', name: 'Bracelets', slug: 'bracelets', featured: true, sort_order: 3 },
    { id: '11111111-0000-0000-0000-000000000004', name: 'Earrings', slug: 'earrings', featured: true, sort_order: 4 },
  ];

  await supabase.from('categories').upsert(categories, { onConflict: 'slug' });

  for (const p of SAMPLE_PRODUCTS) {
    const { image, ...product } = p;
    const { error: pErr } = await supabase.from('products').upsert(product, { onConflict: 'slug' });
    if (pErr) {
      console.error('Product seed error:', p.slug, pErr.message);
      continue;
    }
    await supabase.from('product_images').delete().eq('product_id', p.id);
    await supabase.from('product_images').insert({
      product_id: p.id,
      url: image,
      alt: p.name,
      is_primary: true,
      position: 0,
    });
    console.log('  +', p.name);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
