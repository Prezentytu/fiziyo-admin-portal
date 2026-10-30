'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatActions } from '../ChatActionsContext';
import { NAVIGATE_ROUTES, type ChatViewSpec } from '../utils/viewSpec';
import { ChatCard } from './ChatCard';

type NavigateSpec = Extract<ChatViewSpec, { component: 'Navigate' }>;

export function NavigateCard({ spec, testId }: { readonly spec: NavigateSpec; readonly testId: string }) {
  const { openAddPatient } = useChatActions();
  const target = NAVIGATE_ROUTES[spec.route];

  if (spec.route === 'patient-new') {
    return (
      <ChatCard
        testId={testId}
        title="Nowy pacjent"
        footer={
          <>
            <span className="text-[13px] text-label-secondary">Imię, nazwisko i telefon wystarczą na start</span>
            <Button onClick={openAddPatient} data-testid={`${testId}-primary-btn`}>
              Dodaj pacjenta
            </Button>
          </>
        }
      />
    );
  }

  return (
    <ChatCard
      testId={testId}
      title={target.label}
      footer={
        <>
          <span className="text-[13px] text-label-secondary">Otworzy się widok klasyczny tej sekcji</span>
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
