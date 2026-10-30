'use client';

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatActions } from '../ChatSessionContext';
import { DOCUMENT_ACCEPT, useDocumentAnalysis } from '../useDocumentAnalysis';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';

/**
 * "Skanuj wizytę": recommendations from a visit note or document become a set. Listening to the
 * visit itself is not built yet; the card says so instead of pretending.
 */
export function ScanVisitCard({ spec, testId, messageId, chosen }: CardProps<'ScanVisit'>) {
  const { markChosen, isBusy } = useChatActions();
  const { analyzeFile, analyzeNote } = useDocumentAnalysis();
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Wysłano do analizy: {chosen}
      </p>
    );
  }

  const submitNote = () => {
    if (analyzeNote(note, spec.patientId)) markChosen(messageId, 'notatka');
  };

  return (
    <ChatCard
      testId={testId}
      title="Zalecenia z wizyty"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isBusy}
            data-testid={`${testId}-file-btn`}
          >
            <FileUp aria-hidden="true" />
            Dokument
          </Button>
          <Button
            onClick={submitNote}
            disabled={isBusy || note.trim().length < 20}
            data-testid={`${testId}-primary-btn`}
          >
            Wyłuskaj zalecenia
          </Button>
        </>
      }
    >
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            submitNote();
          }
        }}
        rows={4}
        placeholder="Wklej albo podyktuj notatkę z wizyty, np. „mostki 3×10, przysiad przy ścianie 3×30 s, rozciąganie łydki”"
        aria-label="Notatka z wizyty"
        data-testid={`${testId}-note-input`}
      />
      <input
        ref={fileRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid={`${testId}-file-input`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          markChosen(messageId, file.name);
          analyzeFile(file, spec.patientId);
        }}
      />
      <ChatCardNote>
        Słuchanie rozmowy z wizyty jeszcze nie działa. Na razie zalecenia biorę z notatki albo dokumentu.
      </ChatCardNote>
    </ChatCard>
  );
}
