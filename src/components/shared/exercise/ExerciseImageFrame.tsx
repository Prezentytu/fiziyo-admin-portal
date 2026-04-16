import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ExerciseImageFrameProps {
  src: string;
  alt?: string;
  sizes?: string;
  aspectRatio?: string;
  className?: string;
  imageClassName?: string;
  unoptimized?: boolean;
  dataTestId?: string;
}

export function ExerciseImageFrame({
  src,
  alt = '',
  sizes,
  aspectRatio = 'aspect-video',
  className,
  imageClassName,
  unoptimized = false,
  dataTestId,
}: Readonly<ExerciseImageFrameProps>) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface-light', aspectRatio, className)} data-testid={dataTestId}>
      <div className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-110" style={{ backgroundImage: `url(${src})` }} />
      <Image src={src} alt={alt} fill className={cn('object-contain', imageClassName)} sizes={sizes} unoptimized={unoptimized} />
    </div>
  );
}
