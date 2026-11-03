'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NAVIGATE_ROUTES } from '../utils/viewSpec';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

export function NavigateCard({ spec, testId }: CardProps<'Navigate'>) {
  const target = NAVIGATE_ROUTES[spec.route];
  return (
    <ChatCard
      testId={testId}
      title={target.label}
      footer={
        <>
          <span className="text-[13px] text-label-secondary">Rozmowa zostaje, wrócisz do niej z menu</span>
          <Button asChild data-testid={`${testId}-primary-link`}>
            <Link href={target.href}>
              Przejdź
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </>
      }
    />
  );
}
