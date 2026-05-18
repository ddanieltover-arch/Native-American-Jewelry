import Link from 'next/link';
import { ArrowRight, Star, Shield, Truck, Award } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import {
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  getApprovedTestimonials,
} from '@/lib/db';
import { mapDbProducts } from '@/lib/product-mapper';
import type { Category } from '@/types';

export const revalidate = 60;

export default async function HomePage() {
  const [featuredRaw, newArrivalsRaw, categoriesRaw, testimonials] = await Promise.all([
    getFeaturedProducts(4),
    getNewArrivals(4),
    getCategories(),
    getApprovedTestimonials(3).catch(() => []),
  ]);

  const featured = mapDbProducts(featuredRaw as Record<string, unknown>[]);
  const newArrivals = mapDbProducts(newArrivalsRaw as Record<string, unknown>[]);
  const CATEGORIES = categoriesRaw as Category[];

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-end pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-umber via-brand-charcoal to-brand-obsidian" />

        {/* Decorative turquoise glow */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-brand-turquoise/8 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/6 w-[400px] h-[400px] rounded-full bg-brand-gold/8 blur-[100px]" />

        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
          <div className="max-w-2xl">
            <span
              className="inline-block text-brand-turquoise text-xs tracking-[0.22em] uppercase mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Authentic · Handcrafted · Traditional
            </span>

            <h1
              className="text-display text-brand-bone mb-6 text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Jewelry of the
              <br />
              <em className="italic text-brand-turquoise">Southwest</em>
            </h1>

            <p
              className="text-brand-sand/80 text-lg font-light mb-10 max-w-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Authentic pieces handcrafted by Navajo, Zuni, Hopi & Pueblo artisans.
              Every jewel tells a story passed down through generations.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/shop" className="btn-turquoise flex items-center gap-2 text-sm">
                Shop All Jewelry
                <ArrowRight size={16} />
              </Link>
              <Link href="/about" className="btn-ghost border-white/30 text-brand-bone hover:bg-white/10 hover:border-white/60 text-sm">
                Our Story
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-brand-sand to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── Trust Badges ────────────────────────────────── */}
      <section className="bg-brand-bone border-y border-brand-sand/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Shield, label: 'Certificate of Authenticity', sub: 'Every piece verified' },
            { icon: Award,  label: 'Direct from Artisans',        sub: 'Navajo, Zuni & Hopi' },
            { icon: Truck,  label: 'Free US Shipping',            sub: 'On orders over $75' },
            { icon: Star,   label: '5-Star Reviews',              sub: '200+ happy collectors' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-turquoise/15 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-brand-turquoise" />
              </div>
              <div>
                <p
                  className="text-sm font-medium text-brand-obsidian leading-tight"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </p>
                <p
                  className="text-xs text-brand-sienna mt-0.5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shop by Category ─────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-label text-brand-turquoise">Browse by Type</span>
          <h2
            className="text-heading-xl text-brand-obsidian mt-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Collections
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat, i) => {
            const GRADIENTS = [
              'from-amber-100 to-stone-200',
              'from-teal-100 to-cyan-100',
              'from-rose-100 to-amber-100',
              'from-stone-100 to-neutral-200',
              'from-orange-50 to-amber-100',
              'from-slate-100 to-stone-100',
            ];
            return (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className="group relative overflow-hidden aspect-[3/4] rounded"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} transition-transform duration-500 group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-obsidian/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p
                    className="text-brand-bone text-sm font-light text-center"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {cat.name}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 bg-brand-bone">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-label text-brand-turquoise">Handpicked</span>
              <h2
                className="text-heading-xl text-brand-obsidian mt-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bestsellers
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden md:flex items-center gap-1 text-sm text-brand-sienna hover:text-brand-turquoise transition-colors group"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              View all
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial Banner ──────────────────────────────── */}
      <section className="py-24 px-4 md:px-8 bg-brand-charcoal relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10">
          <div className="w-full h-full bg-gradient-to-l from-brand-turquoise to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-xl">
            <span className="text-label text-brand-turquoise">Why Native American Jewelry</span>
            <h2
              className="text-heading-xl text-brand-bone mt-3 mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              More Than Jewelry —<br />
              <em className="italic text-brand-sand">Living Tradition</em>
            </h2>
            <p
              className="text-brand-sand/80 leading-relaxed mb-8"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every piece in our collection is handcrafted by master jewelers from Navajo,
              Zuni, Hopi, and Pueblo nations — people who have refined these techniques
              across centuries. When you wear our jewelry, you carry that history with you.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                ['100%', 'Authentic Pieces'],
                ['200+', 'Collector Reviews'],
                ['30+', 'Artisan Partners'],
                ['15+', 'Years Experience'],
              ].map(([num, label]) => (
                <div key={label} className="border border-white/10 p-4">
                  <p
                    className="text-2xl font-light text-brand-turquoise"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {num}
                  </p>
                  <p
                    className="text-xs text-brand-sand/60 mt-1 uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-ghost border-white/30 text-brand-bone hover:bg-white/10 hover:border-white text-sm">
              Read Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* ── New Arrivals ──────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-label text-brand-turquoise">Just Arrived</span>
            <h2
              className="text-heading-xl text-brand-obsidian mt-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              New Arrivals
            </h2>
          </div>
          <Link
            href="/shop?sort=newest"
            className="hidden md:flex items-center gap-1 text-sm text-brand-sienna hover:text-brand-turquoise transition-colors group"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            See all new <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 bg-brand-bone">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-label text-brand-turquoise">From Our Collectors</span>
            <h2
              className="text-heading-xl text-brand-obsidian mt-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              What They Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Margaret T.',
                location: 'Santa Fe, NM',
                rating: 5,
                text: 'The squash blossom necklace arrived beautifully packaged with a certificate of authenticity. The quality is extraordinary — every stone perfectly matched.',
                product: 'Squash Blossom Necklace',
              },
              {
                name: 'James R.',
                location: 'Scottsdale, AZ',
                rating: 5,
                text: 'Third purchase from this shop. The Bisbee turquoise ring is spectacular — the depth of color is unlike anything I have seen from other sellers.',
                product: 'Bisbee Turquoise Ring',
              },
              {
                name: 'Linda K.',
                location: 'Denver, CO',
                rating: 5,
                text: 'I have collected Southwest jewelry for 20 years. These pieces are the real thing. The Hopi overlay bracelet is masterwork quality.',
                product: 'Hopi Overlay Bracelet',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white p-6 border border-brand-sand/30">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }, (_, i) => (
                    <Star key={i} size={13} className="fill-brand-gold text-brand-gold" />
                  ))}
                </div>
                <p
                  className="text-brand-obsidian leading-relaxed mb-4 text-sm"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  "{t.text}"
                </p>
                <div className="border-t border-brand-bone pt-3">
                  <p
                    className="text-sm font-medium text-brand-obsidian"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="text-xs text-brand-sienna"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t.location} · {t.product}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
