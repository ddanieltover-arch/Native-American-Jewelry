# Native American Jewelry — Storefront

Production Next.js 14 storefront for Native American Jewelry.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS + custom CSS variables |
| State | Zustand (cart, wishlist, recently viewed) |
| Animations | Framer Motion |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Auth | Supabase Auth + NextAuth |
| Email | Resend + React Email |
| Queue | BullMQ + Redis |
| Deploy | Vercel |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars
cp .env.example .env.local
# Fill in your Supabase, Resend keys

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (store)/          # Customer-facing storefront
│   │   ├── page.tsx      # Homepage
│   │   ├── shop/         # Product catalog
│   │   ├── product/[slug]/ # Product detail
│   │   ├── checkout/     # Multi-step checkout
│   │   └── account/      # Customer account
│   └── api/              # API routes
├── components/
│   ├── layout/           # Header, Footer, MobileNav
│   └── store/            # ProductCard, CartDrawer, Notifications
├── lib/
│   ├── store.ts          # Zustand global state
│   ├── supabase.ts       # Supabase clients
│   ├── utils.ts          # Helpers
│   └── mock-data.ts      # Demo product data
├── types/                # TypeScript types
└── styles/               # Global CSS
```

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — hero, categories, featured, testimonials |
| `/shop` | Catalog — filter by category, price, sort |
| `/product/[slug]` | Product detail — gallery, variants, add to cart |
| `/checkout` | Multi-step checkout — info → shipping → payment |
| `/account` | Customer — orders, wishlist, profile |

## Key Features

- **Cart drawer** — slide-in with free shipping progress bar
- **Sales notifications** — random USA state popups every 30–90s  
- **Product quick-add** — hover to add without leaving catalog
- **Manual payment** — Chime, CashApp, Apple Cash, Zelle, Bank Transfer
- **5% discount** — automatically applied from source prices
- **Mobile bottom nav** — full PWA-ready navigation
- **Wishlist** — persisted to localStorage
- **Recently viewed** — tracks last 8 products

## Payment Flow

1. Customer selects payment method at checkout
2. Order placed → confirmation email sent via Resend with payment instructions
3. Customer sends payment and uploads proof from `/account/orders`
4. Admin verifies in dashboard → marks Confirmed
5. Fulfillment begins

## Connecting to Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations from `packages/database/migrations/`
3. Add keys to `.env.local`
4. Replace mock-data imports with Supabase queries

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all `.env.example` vars to your Vercel project settings.

## Extending

| What | Where |
|---|---|
| Add products | `src/lib/mock-data.ts` or connect Supabase |
| Change brand colors | `tailwind.config.js` + `src/styles/globals.css` |
| Add payment method | `src/lib/utils.ts` → PAYMENT_METHOD_LABELS |
| New page | `src/app/(store)/new-page/page.tsx` |
| Admin dashboard | Next sprint — see architecture doc |
