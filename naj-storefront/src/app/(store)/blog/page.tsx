import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Blog | Native American Jewelry',
  description:
    'Stories, guides, and inspiration about Native American jewelry, turquoise, and Southwest style.',
};

const POSTS = [
  {
    slug: 'turquoise-addiction',
    title: 'Desert Scenes and Turquoise? Yes Please.',
    excerpt:
      'Why collectors fall in love with Kingman, Royston, and Sonoran stones — and how to build a wardrobe of sterling silver that tells your story.',
    date: 'March 12, 2026',
    category: 'Style',
  },
  {
    slug: 'squash-blossom-guide',
    title: 'The Squash Blossom Necklace: A Collector\'s Guide',
    excerpt:
      'From the naja to blossom count, learn what makes a squash blossom special and how artisans across the Southwest craft these iconic pieces.',
    date: 'February 28, 2026',
    category: 'Education',
  },
  {
    slug: 'caring-for-silver',
    title: 'Keeping Your Sterling Silver Brilliant',
    excerpt:
      'Simple daily habits and storage tips to protect turquoise, prevent tarnish, and preserve hand-stamped detail for generations.',
    date: 'February 10, 2026',
    category: 'Care',
  },
  {
    slug: 'authenticity-matters',
    title: 'Why Authenticity Matters in Native American Jewelry',
    excerpt:
      'How to shop with confidence, read hallmarks, and support Navajo, Zuni, Hopi, and Pueblo artists — not mass-produced imitations.',
    date: 'January 22, 2026',
    category: 'Heritage',
  },
];

export default function BlogPage() {
  return (
    <div className="bg-brand-parchment min-h-screen">
      <div className="bg-brand-obsidian text-brand-bone py-14 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-brand-sand/70 hover:text-brand-turquoise transition-colors mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
          <span className="text-label text-brand-turquoise block mb-2">Journal</span>
          <h1
            className="text-heading-xl text-brand-bone"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Blog
          </h1>
          <p
            className="text-brand-sand/80 mt-3 text-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Peace, love, and turquoise — stories from the Southwest, collecting tips, and behind
            the scenes from Native American Jewelry.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-14">
        <ul className="space-y-8">
          {POSTS.map((post) => (
            <li
              key={post.slug}
              className="border-b border-brand-sand/40 pb-8 last:border-0"
            >
              <p className="text-label text-brand-turquoise text-[10px] mb-2">
                {post.category} · {post.date}
              </p>
              <h2
                className="text-xl text-brand-obsidian mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {post.title}
              </h2>
              <p
                className="text-sm text-brand-obsidian/75 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {post.excerpt}
              </p>
              <span
                className="inline-flex items-center gap-1 text-sm text-brand-sienna"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Full article coming soon <ArrowRight size={14} />
              </span>
            </li>
          ))}
        </ul>

        <p
          className="mt-12 text-sm text-brand-sienna text-center"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Subscribe in our footer for new arrivals and journal updates.
        </p>
      </div>
    </div>
  );
}
