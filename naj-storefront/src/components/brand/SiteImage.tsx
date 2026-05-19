import Image from 'next/image';
import { cn } from '@/lib/utils';

type SiteImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Use for hero / banner fills */
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
};

export default function SiteImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  priority,
  sizes,
}: SiteImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? '100vw'}
        className={cn('object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 800}
      priority={priority}
      sizes={sizes}
      className={cn('w-full h-auto', className)}
    />
  );
}
