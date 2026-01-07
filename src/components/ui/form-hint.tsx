'use client';

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface FormHintProps {
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function FormHint({ children, className, showIcon = false }: FormHintProps) {
  return (
    <p
      className={cn(
        'text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5',
        className
      )}
    >
      {showIcon && <Info className="h-3 w-3 shrink-0 mt-0.5" />}
      <span>{children}</span>
    </p>
  );
}










