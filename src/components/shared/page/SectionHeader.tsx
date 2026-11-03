import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  readonly id?: string;
  readonly title: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

/** 17px section title with an optional trailing link or button. */
export function SectionHeader({ id, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3', className)}>
      <h2 id={id} className="text-[17px] font-semibold leading-[22px] text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

export const SECTION_LINK_CLASS =
  'rounded-md py-2.5 text-[15px] font-semibold text-tint transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
