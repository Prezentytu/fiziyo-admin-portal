import type { ReactNode } from 'react';

interface LegalSectionProps {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, index, title, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border/60 pt-8 first:border-t-0 first:pt-0"
    >
      <header className="mb-4 flex items-baseline gap-3">
        <span
          aria-hidden
          className="font-mono text-xs font-medium tabular-nums text-text-tertiary"
        >
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      </header>
      <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
