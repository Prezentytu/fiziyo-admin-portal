import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  readonly name?: string | null;
  readonly imageUrl?: string | null;
  readonly muted?: boolean;
  readonly className?: string;
}

/** Round avatar with DS avatar tokens; `muted` for patients without an account. */
export function InitialsAvatar({ name, imageUrl, muted = false, className }: InitialsAvatarProps) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <Avatar className={cn('h-9 w-9 shrink-0', className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt="" />}
      <AvatarFallback
        className={cn(
          'text-[14px] font-bold',
          muted ? 'bg-fill-tertiary text-label-secondary' : 'bg-avatar text-avatar-label'
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
