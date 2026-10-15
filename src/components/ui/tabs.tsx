'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center gap-0.5 rounded-[10px] bg-fill-tertiary p-0.5 text-label-secondary',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
  'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[8px] px-3 text-[13px] font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      activeVariant: {
        surface: 'data-[state=active]:bg-elevated data-[state=active]:text-foreground data-[state=active]:shadow-raised',
        subtle: 'data-[state=active]:bg-elevated data-[state=active]:text-foreground data-[state=active]:shadow-none',
        accent:
          'data-[state=active]:bg-tint-muted data-[state=active]:text-tint data-[state=active]:shadow-none',
        success:
          'data-[state=active]:bg-status-success-muted data-[state=active]:text-status-success data-[state=active]:shadow-none',
        warning:
          'data-[state=active]:bg-status-warning-muted data-[state=active]:text-status-warning data-[state=active]:shadow-none',
        destructive:
          'data-[state=active]:bg-status-danger-muted data-[state=active]:text-status-danger data-[state=active]:shadow-none',
      },
    },
    defaultVariants: {
      activeVariant: 'surface',
    },
  }
);

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, activeVariant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ activeVariant }), className)}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
