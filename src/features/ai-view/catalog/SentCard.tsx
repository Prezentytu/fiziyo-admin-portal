'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PatientQRCodeDialog } from '@/features/patients/PatientQRCodeDialog';
import { useChatActions } from '../ChatSessionContext';
import type { CardProps } from './cardProps';
import { ChatCard } from './ChatCard';

/**
 * The plan is saved. A patient without an account does not see it in the app yet, so the card
 * offers the next step that already exists on the patient card: QR code, link or printed card.
 */
export function SentCard({ spec, testId }: CardProps<'Sent'>) {
  const { organizationId, therapistId, patients, showPatient } = useChatActions();
  const patient = patients.find((candidate) => candidate.id === spec.patientId);
  const [isAccessOpen, setAccessOpen] = useState(false);
  const needsAccess = Boolean(patient?.isShadowUser && therapistId);
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
          {needsAccess && (
            <Button onClick={() => setAccessOpen(true)} data-testid={`${testId}-access-btn`}>
              <QrCode aria-hidden="true" />
              Kod QR, link, wydruk
            </Button>
          )}
        </>
      }
    >
      {needsAccess && patient && therapistId && (
        <>
          <p className="text-[14px] text-label-secondary">
            Pacjent nie ma jeszcze konta w aplikacji. Plan zobaczy po założeniu konta albo na wydruku.
          </p>
          {isAccessOpen && (
            <PatientQRCodeDialog
              open
              onOpenChange={setAccessOpen}
              patient={{ id: patient.id, name: patient.name, email: patient.email, isShadowUser: patient.isShadowUser }}
              therapistId={therapistId}
              organizationId={organizationId}
            />
          )}
        </>
      )}
    </ChatCard>
  );
}
