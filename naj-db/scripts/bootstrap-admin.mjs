import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const email = process.argv[2] || 'orders@nativeamericajewelry.com';

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query(
  `INSERT INTO admin_users (email, role) VALUES ($1, 'super_admin') ON CONFLICT (email) DO NOTHING`,
  [email.trim().toLowerCase()]
);
const tables = await c.query(
  `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`
);
const admins = await c.query(`SELECT email, role FROM admin_users ORDER BY email`);
const products = await c.query(`SELECT COUNT(*)::int AS n FROM products`);
const shipping = await c.query(`SELECT COUNT(*)::int AS n FROM shipping_rates`);
console.log(
  JSON.stringify(
    {
      tables: tables.rows[0].n,
      admins: admins.rows,
      products: products.rows[0].n,
      shipping_rates: shipping.rows[0].n,
    },
    null,
    2
  )
);
await c.end();
