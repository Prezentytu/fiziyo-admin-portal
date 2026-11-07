'use client';

import { useRef, useState, type ClipboardEvent } from 'react';
import { FileUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getPastedScreenshot } from '@/utils/documentFormats';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { DOCUMENT_ACCEPT, MIN_NOTE_LENGTH, useDocumentAnalysis } from '../useDocumentAnalysis';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';

/**
 * "Skanuj wizytę": recommendations from a visit note, a document, or a photo or screenshot of a note
 * the therapist adds become a set. A screenshot pasted into the note field is analyzed as that image.
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
  // Text pastes as usual; only a screenshot (an image with no text) is analyzed as the note.
  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const screenshot = getPastedScreenshot(event.clipboardData);
    if (!screenshot || isBusy) return;
    event.preventDefault();
    void submitFile(screenshot);
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
            Dokument lub zdjęcie
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
        data-testid={`${testId}-note-input`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void submitNote();
          }
        }}
        rows={4}
        placeholder="Wklej albo podyktuj notatkę z wizyty, np. „mostki 3×10, przysiad przy ścianie 3×30 s, rozciąganie łydki”. Możesz też wkleić zrzut ekranu."
        aria-label="Notatka z wizyty"
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
      <ChatCardNote>Zalecenia biorę tylko z notatki, dokumentu albo zdjęcia, które tu dodasz.</ChatCardNote>
    </ChatCard>
  );
}
