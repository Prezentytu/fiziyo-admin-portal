'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-[16px] group-[.toaster]:bg-popover group-[.toaster]:text-foreground group-[.toaster]:border-hairline group-[.toaster]:shadow-floating',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:rounded-full group-[.toast]:bg-tint-fill group-[.toast]:text-on-tint',
          cancelButton: 'group-[.toast]:rounded-full group-[.toast]:bg-fill-tertiary group-[.toast]:text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
