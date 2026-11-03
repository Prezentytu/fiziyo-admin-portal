import { cn } from '@/lib/utils';

interface LengthHintProps {
  id: string;
  length: number;
  min: number;
  /** Text before the count while the field is still too short. */
  shortPrefix?: string;
}

export function LengthHint({ id, length, min, shortPrefix = '' }: LengthHintProps) {
  const isShort = length < min;
  return (
    <p id={id} className={cn('text-[12px]', isShort ? 'text-status-warning' : 'text-label-secondary')}>
      {isShort ? `${shortPrefix}${length} z co najmniej ${min} znaków` : `${length} znaków`}
    </p>
  );
}
