import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const LOGO_SRC = '/logo.png';
export const LOGO_ALT =
  'Native American Jewelry — Handcrafted Heritage Spirit';

type LogoProps = {
  className?: string;
  height?: number;
  href?: string | null;
  priority?: boolean;
};

export default function Logo({
  className,
  height = 48,
  href = null,
  priority = false,
}: LogoProps) {
  const width = Math.round(height * 2.4);

  const image = (
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={width}
      height={height}
      priority={priority}
      className={cn('w-auto object-contain', className)}
      style={{ height, width: 'auto', maxWidth: width }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {image}
      </Link>
    );
  }

  return image;
}
