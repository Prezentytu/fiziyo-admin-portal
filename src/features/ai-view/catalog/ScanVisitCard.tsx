'use client';

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { DOCUMENT_ACCEPT, MIN_NOTE_LENGTH, useDocumentAnalysis } from '../useDocumentAnalysis';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';

/**
 * "Skanuj wizytę": recommendations from a visit note or document become a set. Listening to the
 * visit itself is not built yet; the card says so instead of pretending.
 */
export function ScanVisitCard({ spec, testId, messageId, chosen }: CardProps<'ScanVisit'>) {
  const { markChosen } = useChatActions();
  const isBusy = useChatBusy();
  const { analyzeFile, analyzeNote } = useDocumentAnalysis();
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (chosen !== undefined) {
    return (
      <p data-testid={testId} className="text-[14px] text-label-secondary">
        Przeanalizowano: {chosen}
      </p>
    );
  }

  // The card stays open until the analysis answers, so a failed one can be retried here.
  const submitNote = async () => {
    if (await analyzeNote(note, spec.patientId)) markChosen(messageId, 'notatka');
  };
  const submitFile = async (file: File) => {
    if (await analyzeFile(file, spec.patientId)) markChosen(messageId, file.name);
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
            onClick={() => void submitNote()}
            disabled={isBusy || note.trim().length < MIN_NOTE_LENGTH}
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
            void submitNote();
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
          void submitFile(file);
        }}
      />
      <ChatCardNote>
        Słuchanie rozmowy z wizyty jeszcze nie działa. Na razie zalecenia biorę z notatki albo dokumentu.
      </ChatCardNote>
    </ChatCard>
  );
}
