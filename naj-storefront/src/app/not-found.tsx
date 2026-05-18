import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-parchment flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Decorative */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="w-32 h-32 rounded-full bg-brand-bone flex items-center justify-center">
            <span className="text-5xl opacity-40">💎</span>
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-brand-turquoise/20 border border-brand-turquoise/30 flex items-center justify-center">
            <span className="text-lg">?</span>
          </div>
        </div>

        <span
          className="block text-[10px] font-medium tracking-[0.2em] uppercase text-brand-turquoise mb-3"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          404
        </span>

        <h1
          className="text-heading-xl text-brand-obsidian mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Page not found
        </h1>

        <p
          className="text-brand-sienna leading-relaxed mb-8"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          The piece you're looking for may have sold out or been moved.
          Explore our full collection to find something equally beautiful.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-ghost flex items-center justify-center gap-2 text-sm">
            <ArrowLeft size={14} />
            Back to Home
          </Link>
          <Link href="/shop" className="btn-primary flex items-center justify-center gap-2 text-sm">
            <Search size={14} />
            Browse All Jewelry
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 pt-8 border-t border-brand-bone">
          <p
            className="text-xs text-brand-sienna mb-4 tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.1em' }}
          >
            Popular Collections
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Necklaces', 'Rings', 'Bracelets', 'Earrings', 'Concho Belts'].map((cat) => (
              <Link
                key={cat}
                href={`/shop?category=${cat.toLowerCase().replace(' ', '-')}`}
                className="px-3 py-1.5 text-xs border border-brand-bone text-brand-sienna hover:border-brand-turquoise hover:text-brand-turquoise transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
