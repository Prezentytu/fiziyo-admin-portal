'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

export function SentCard({ spec, testId }: CardProps<'Sent'>) {
  const { patients, showPatient } = useChatActions();
  const patient = patients.find((candidate) => candidate.id === spec.patientId);
  return (
    <ChatCard
      testId={testId}
      title={spec.setName}
      badge={
        <span className="inline-flex h-[22px] items-center gap-1.5 rounded-badge bg-tint-muted px-2 text-[12px] font-semibold text-tint">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          wysłane
        </span>
      }
      meta={<span>{spec.planLabel}</span>}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showPatient(spec.patientId)}
            data-testid={`${testId}-context-btn`}
          >
            Kontekst pacjenta
          </Button>
          <Button variant="outline" asChild data-testid={`${testId}-open-link`}>
            <Link href={`/patients/${spec.patientId}`}>{patient ? `Karta: ${patient.name}` : 'Karta pacjenta'}</Link>
          </Button>
        </>
      }
    />
  );
}
