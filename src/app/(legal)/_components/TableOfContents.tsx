import Link from 'next/link';

export interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  testId: string;
}

export function TableOfContents({ items, testId }: TableOfContentsProps) {
  return (
    <nav
      aria-label="Spis treści"
      data-testid={testId}
      className="hidden xl:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto print:hidden"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Spis treści
      </p>
      <ol className="space-y-1.5 text-sm">
        {items.map((item, index) => (
          <li key={item.id}>
            <Link
              href={`#${item.id}`}
              className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[10px] tabular-nums text-text-tertiary group-hover:text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leading-snug">{item.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
