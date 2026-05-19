import Link from 'next/link';
import SiteImage from '@/components/brand/SiteImage';
import type { CollectionCategory } from '@/lib/db';

type CategoryCollectionCardProps = {
  category: CollectionCategory;
  imageSizes: string;
};

export default function CategoryCollectionCard({
  category,
  imageSizes,
}: CategoryCollectionCardProps) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className="group relative overflow-hidden aspect-[3/4] rounded block"
    >
      {category.thumbnail_url ? (
        <SiteImage
          src={category.thumbnail_url}
          alt={category.name}
          fill
          sizes={imageSizes}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-300" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-obsidian/65 via-brand-obsidian/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="text-brand-bone text-sm font-light text-center leading-snug"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {category.name}
        </p>
      </div>
    </Link>
  );
}
