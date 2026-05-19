import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteImage from '@/components/brand/SiteImage';
import { SITE_IMAGES, IMAGE_ALT } from '@/lib/site-images';

export const metadata = {
  title: 'Our Story | Native American Jewelry',
  description:
    'Learn about our commitment to authentic Southwest jewelry handcrafted by Navajo, Zuni, Hopi, and Pueblo artisans.',
};

export default function AboutPage() {
  return (
    <div>
      <section className="relative min-h-[360px] md:min-h-[480px]">
        <SiteImage
          src={SITE_IMAGES.storeBoutique}
          alt={IMAGE_ALT.storeBoutique}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-obsidian/85 via-brand-obsidian/40 to-brand-obsidian/20" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
          <span className="text-label text-brand-turquoise">Our Story</span>
          <h1
            className="text-heading-xl text-brand-bone mt-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Jewelry of the Southwest
          </h1>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
        <div
          className="prose prose-stone max-w-none space-y-6 text-brand-obsidian/85"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <p>
            Native American Jewelry curates authentic pieces handcrafted by master artisans from
            Navajo, Zuni, Hopi, and Pueblo nations. Every item in our collection is selected for
            quality, traditional technique, and lasting beauty.
          </p>
          <p>
            We work directly with artists and trusted sources across the Southwest. Each piece over
            $150 includes documentation of authenticity and careful packaging for collectors
            worldwide.
          </p>
          <p>
            Our checkout uses secure manual payment methods — Chime, CashApp, Apple Cash, Zelle, and
            bank transfer — with personal verification before your order ships.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
            <SiteImage
              src={SITE_IMAGES.storeInterior}
              alt={IMAGE_ALT.storeInterior}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
            <SiteImage
              src={SITE_IMAGES.packagingPremium}
              alt={IMAGE_ALT.packagingPremium}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
            />
          </div>
        </div>

        <Link href="/shop" className="btn-turquoise inline-flex items-center gap-2 mt-10 text-sm">
          Shop the Collection <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
