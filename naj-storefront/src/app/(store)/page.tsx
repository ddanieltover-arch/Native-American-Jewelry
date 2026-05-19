import Link from 'next/link';
import { ArrowRight, Star, Shield, Truck, Award } from 'lucide-react';
import ProductCard from '@/components/store/ProductCard';
import SiteImage from '@/components/brand/SiteImage';
import {
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
} from '@/lib/db';
import { mapDbProducts } from '@/lib/product-mapper';
import { SITE_IMAGES, IMAGE_ALT } from '@/lib/site-images';
import { FREE_SHIPPING_THRESHOLD_US } from '@/lib/shipping-constants';
import type { Category } from '@/types';

export const revalidate = 60;

export default async function HomePage() {
  const [featuredRaw, newArrivalsRaw, categoriesRaw] = await Promise.all([
    getFeaturedProducts(4),
    getNewArrivals(4),
    getCategories(),
  ]);

  const featured = mapDbProducts(featuredRaw as Record<string, unknown>[]);
  const newArrivals = mapDbProducts(newArrivalsRaw as Record<string, unknown>[]);
  const CATEGORIES = categoriesRaw as Category[];

  return (
    <div>
      {/* ── Hero (designed banner) ─────────────────────────── */}
      <section className="relative w-full min-h-[520px] sm:min-h-[640px] lg:min-h-[min(88vh,820px)] overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-3 sm:top-4 md:top-5">
          <SiteImage
            src={SITE_IMAGES.heroMain}
            alt={IMAGE_ALT.heroMain}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[42%_18%] sm:object-[45%_20%] lg:object-[48%_22%]"
          />
        </div>
        <Link
          href="/shop"
          className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise focus-visible:ring-offset-2"
          aria-label="Explore the jewelry collection"
        >
          <span className="sr-only">Explore collection</span>
        </Link>
      </section>

      {/* ── Trust Badges ────────────────────────────────── */}
      <section className="bg-brand-bone border-y border-brand-sand/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Shield, label: 'Certificate of Authenticity', sub: 'Every piece verified' },
            { icon: Award, label: 'Direct from Artisans', sub: 'Navajo, Zuni & Hopi' },
            { icon: Truck, label: 'Free US Shipping', sub: `On orders over $${FREE_SHIPPING_THRESHOLD_US}` },
            { icon: Star, label: '5-Star Reviews', sub: '200+ happy collectors' },
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

      {/* ── Lifestyle editorial ───────────────────────────── */}
      <section className="grid md:grid-cols-2 min-h-[420px]">
        <div className="relative min-h-[320px] md:min-h-full">
          <SiteImage
            src={SITE_IMAGES.lifestyleDesert}
            alt={IMAGE_ALT.lifestyleDesert}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-8 md:px-14 py-14 bg-brand-parchment">
          <span className="text-label text-brand-turquoise">Wear the Southwest</span>
          <h2
            className="text-heading-xl text-brand-obsidian mt-3 mb-5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Layered turquoise.<br />
            <em className="italic text-brand-turquoise">Living tradition.</em>
          </h2>
          <p
            className="text-brand-sienna leading-relaxed mb-8 max-w-md"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Squash blossom necklaces, concho cuffs, and sterling pearls — curated for collectors
            who want authentic artistry you can feel in every stone.
          </p>
          <Link href="/shop" className="btn-primary inline-flex items-center gap-2 text-sm w-fit">
            Shop Necklaces & Cuffs <ArrowRight size={16} />
          </Link>
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

      {/* ── Flatlay feature ───────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <SiteImage
            src={SITE_IMAGES.jewelryFlatlay}
            alt={IMAGE_ALT.jewelryFlatlay}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-brand-obsidian/55" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 text-center">
          <span className="text-label text-brand-turquoise">Sterling & Turquoise</span>
          <h2
            className="text-heading-xl text-brand-bone mt-3 mb-5 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Every piece tells a story
          </h2>
          <p
            className="text-brand-sand/85 max-w-xl mx-auto mb-8 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Hand-stamped silver, natural turquoise, and techniques passed down through
            generations of Navajo, Zuni, Hopi, and Pueblo jewelers.
          </p>
          <Link
            href="/shop"
            className="btn-turquoise inline-flex items-center gap-2 text-sm"
          >
            View All Pieces <ArrowRight size={16} />
          </Link>
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

      {/* ── Heritage + store ────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 bg-brand-charcoal">
        <div className="flex flex-col justify-center px-8 md:px-14 py-16 order-2 lg:order-1">
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
            Every piece is handcrafted by master jewelers from Navajo, Zuni, Hopi, and Pueblo
            nations. When you wear our jewelry, you carry that history with you.
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
          <Link
            href="/about"
            className="btn-ghost border-white/30 text-brand-bone hover:bg-white/10 hover:border-white text-sm w-fit"
          >
            Read Our Story
          </Link>
        </div>
        <div className="relative min-h-[360px] order-1 lg:order-2">
          <SiteImage
            src={SITE_IMAGES.storeInterior}
            alt={IMAGE_ALT.storeInterior}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* ── Packaging ─────────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8 bg-brand-parchment">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-label text-brand-turquoise">Unboxing Experience</span>
            <h2
              className="text-heading-xl text-brand-obsidian mt-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Gift-ready presentation
            </h2>
            <p className="text-brand-sienna mt-3 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              Every order arrives in branded packaging with a certificate of authenticity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <SiteImage
                src={SITE_IMAGES.packagingPremium}
                alt={IMAGE_ALT.packagingPremium}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <SiteImage
                src={SITE_IMAGES.packagingGift}
                alt={IMAGE_ALT.packagingGift}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Boutique visit ────────────────────────────────── */}
      <section className="relative min-h-[380px] flex items-center">
        <SiteImage
          src={SITE_IMAGES.storeBoutique}
          alt={IMAGE_ALT.storeBoutique}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-obsidian/80 via-brand-obsidian/50 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-16 w-full">
          <div className="max-w-md">
            <span className="text-label text-brand-turquoise">Our Boutique</span>
            <h2
              className="text-heading-lg text-brand-bone mt-2 mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Handcrafted heritage, in person
            </h2>
            <p className="text-brand-sand/80 text-sm mb-6" style={{ fontFamily: 'var(--font-body)' }}>
              Visit our Southwest showroom or shop online — the same curated collection,
              the same commitment to authentic Native American artistry.
            </p>
            <Link href="/contact" className="btn-turquoise text-sm inline-flex items-center gap-2">
              Contact Us <ArrowRight size={14} />
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
                  &ldquo;{t.text}&rdquo;
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
