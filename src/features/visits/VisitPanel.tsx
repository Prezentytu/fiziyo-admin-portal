'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, FileText, Mic, MicOff, Pause, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useVisitListening } from './useVisitListening';
import { visitRequest, type VisitDraft, type VisitExercise, type VisitNote } from './visitService';

const labels: Record<keyof VisitNote, string> = {
  subjective: 'Wywiad',
  objective: 'Badanie',
  assessment: 'Ocena',
  plan: 'Plan terapii',
};
const listeningLabels = {
  idle: 'Słuchanie wyłączone',
  starting: 'Uruchamianie słuchania',
  listening: 'Słuchanie',
  stopping: 'Zatrzymywanie słuchania',
  paused: 'Słuchanie wstrzymane',
};

export function VisitPanel({
  patientId,
  organizationId,
  onPlan,
  onSaved,
  onListeningChange,
}: {
  patientId: string;
  organizationId: string;
  onPlan: (exercises: VisitExercise[]) => void;
  onSaved?: () => void;
  onListeningChange?: (listening: boolean) => void;
}) {
  const capture = useVisitListening();
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState<VisitDraft | null>(null);
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const listening = ['starting', 'listening', 'stopping'].includes(capture.state);
  const dirty = Boolean(capture.transcript || draft);
  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);
  useEffect(() => () => onListeningChange?.(false), [onListeningChange]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function generate() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await visitRequest<VisitDraft>(
        'visit-draft',
        { patientId, organizationId, transcript: capture.transcript },
        abort.signal
      );
      setDraft(result);
      setInstructions(result.instructions.map((item) => item.text).join('\n'));
      setReviewed(false);
    } catch (failure) {
      if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Błąd przygotowania szkicu.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function save() {
    if (!draft || !reviewed || pending.current || saved) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setSaveAttempted(true);
    requestId.current ??= crypto.randomUUID();
    const abort = new AbortController();
    controller.current = abort;
    try {
      await visitRequest(
        'visit-note',
        { patientId, organizationId, requestId: requestId.current, note: draft.note, instructions },
        abort.signal
      );
      setSaved(true);
      onSaved?.();
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(failure instanceof Error ? failure.message : 'Błąd zapisu. Ponów ten sam zapis.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const complete =
    draft?.exercises.length &&
    draft.exercises.every((exercise) => exercise.exerciseId && exercise.sets && (exercise.reps || exercise.duration));

  return (
    <section
      className="w-full min-w-0 max-w-3xl space-y-8 text-foreground wrap-anywhere"
      aria-label="Asystent wizyty"
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold">Wizyta AI</h2>
          <span className="text-xs text-muted-foreground">wersja testowa</span>
        </div>
        <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">
          <p>Testuj na rozmowach syntetycznych. Rozpoznawanie mowy może korzystać z usługi dostawcy przeglądarki.</p>
          <p>Tekst pozostaje w pamięci tej karty. Odświeżenie lub opuszczenie pacjenta go usuwa.</p>
        </div>
      </header>

      {!draft && (
        <>
          <div className="space-y-4">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                data-testid="visit-consent"
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
                checked={consent}
                disabled={listening}
                onChange={(event) => setConsent(event.target.checked)}
              />
              Uczestnicy wiedzą o słuchaniu i zgodzili się na nie.
            </label>
            <div
              className="flex flex-wrap items-center justify-between gap-4 bg-surface-light px-4 py-3"
              role="group"
              aria-label="Sterowanie słuchaniem"
            >
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  data-testid="visit-start"
                  variant={capture.transcript.trim().length < 20 ? 'default' : 'outline'}
                  className="min-h-11"
                  disabled={!consent || !capture.supported || listening || busy}
                  onClick={capture.start}
                >
                  <Mic aria-hidden="true" />
                  {capture.state === 'paused' ? 'Wznów słuchanie' : 'Rozpocznij słuchanie'}
                </Button>
                <Button
                  data-testid="visit-pause"
                  variant="outline"
                  className="min-h-11"
                  disabled={!listening || capture.state === 'stopping'}
                  onClick={capture.pause}
                >
                  <Pause aria-hidden="true" />
                  Wstrzymaj
                </Button>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span role="status" className="flex min-w-0 items-center gap-2">
                  {listening ? (
                    <Mic className="size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <MicOff className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  {listeningLabels[capture.state]}
                </span>
                <span role="timer" aria-label="Czas słuchania" className="font-mono tabular-nums text-muted-foreground">
                  {Math.floor(capture.seconds / 60)}:{String(capture.seconds % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
            {!capture.supported && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Brak obsługi mikrofonu w tej przeglądarce. Możesz wpisać transkrypt.
              </p>
            )}
            {capture.error && (
              <p role="alert" className="text-sm text-destructive">
                {capture.error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block space-y-2 text-sm font-medium">
              <span>Transkrypt</span>
              <Textarea
                data-testid="visit-transcript"
                className="min-h-56 resize-y bg-card p-4 text-base font-normal leading-relaxed shadow-none md:text-base"
                value={capture.transcript}
                maxLength={40000}
                disabled={listening || busy}
                rows={7}
                onChange={(event) => capture.setTranscript(event.target.value)}
              />
            </label>
            {capture.interim && (
              <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
                {capture.interim}
              </p>
            )}
            <Button
              data-testid="visit-generate"
              className="min-h-11"
              disabled={listening || busy || capture.transcript.trim().length < 20 || capture.transcript.length > 40000}
              onClick={generate}
            >
              <FileText aria-hidden="true" />
              {busy ? 'Przygotowywanie…' : 'Przygotuj szkic wizyty'}
            </Button>
          </div>
        </>
      )}

      {draft && (
        <>
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Szkic notatki</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Szkic wymaga sprawdzenia z rozmową. Cytat potwierdza źródło tekstu, nie gwarantuje poprawności
              interpretacji AI.
            </p>
            {draft.missingInformation.length > 0 && (
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="font-medium">Do uzupełnienia</p>
                <ul className="list-disc space-y-1 pl-5">
                  {draft.missingInformation.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-6">
            {(Object.keys(labels) as (keyof VisitNote)[]).map((section) => (
              <div key={section} className="space-y-2">
                <label className="block space-y-2 text-sm font-medium">
                  <span>{labels[section]}</span>
                  <Textarea
                    data-testid={`visit-${section}`}
                    className="resize-y bg-card p-4 text-base font-normal leading-relaxed shadow-none md:text-base"
                    value={draft.note[section]}
                    disabled={saveAttempted || busy}
                    onChange={(event) => {
                      setReviewed(false);
                      setDraft({ ...draft, note: { ...draft.note, [section]: event.target.value } });
                    }}
                  />
                </label>
                <details className="text-sm leading-relaxed text-muted-foreground">
                  <summary
                    data-testid={`visit-source-${section}`}
                    className="min-h-11 cursor-pointer rounded-sm py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Źródła z rozmowy
                  </summary>
                  {draft.evidence
                    .filter((evidence) => evidence.section === section)
                    .map((evidence, index) => (
                      <blockquote key={index} className="mt-2 border-l-2 border-border pl-4">
                        {evidence.sourceQuote}
                      </blockquote>
                    ))}
                </details>
              </div>
            ))}
            <label className="block space-y-2 text-sm font-medium">
              <span>Zalecenia domowe</span>
              <Textarea
                data-testid="visit-instructions"
                className="resize-y bg-card p-4 text-base font-normal leading-relaxed shadow-none md:text-base"
                value={instructions}
                disabled={saveAttempted || busy}
                onChange={(event) => {
                  setInstructions(event.target.value);
                  setReviewed(false);
                }}
              />
            </label>
          </div>
          {draft.exercises.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">Ćwiczenia ze szkicu</h3>
              {draft.exercises.map((exercise, index) => (
                <div key={index} className="space-y-2 rounded-md border border-border p-4 text-sm leading-relaxed">
                  <strong className="font-medium">{exercise.name}</strong>
                  <p>
                    Serie: {exercise.sets ?? 'do ustalenia'} · Powtórzenia: {exercise.reps ?? '—'} · Czas:{' '}
                    {exercise.duration ?? '—'} s · {exercise.frequency ?? 'częstotliwość do ustalenia'}
                  </p>
                  <p className="text-muted-foreground">{exercise.sourceQuote}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-4 border-t border-border pt-6">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                data-testid="visit-reviewed"
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
                checked={reviewed}
                disabled={saveAttempted}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              Sprawdziłem treść i poprawiłem błędy.
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                data-testid="visit-save"
                className="min-h-11"
                variant={saved ? 'outline' : 'default'}
                onClick={save}
                disabled={!reviewed || busy || saved}
              >
                {saved ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
                {saved ? 'Notatka zapisana' : saveAttempted ? 'Ponów ten sam zapis' : 'Zapisz sprawdzoną notatkę'}
              </Button>
              <Button
                data-testid="visit-assign-plan"
                className="min-h-11"
                variant={saved && complete ? 'default' : 'outline'}
                disabled={!saved || !complete}
                onClick={() => onPlan(draft.exercises)}
              >
                Przejdź do przypisania ćwiczeń
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
            {saved && (
              <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                Notatka zapisana jako edytowalny szkic w dokumentacji pacjenta. Plan wymaga osobnego sprawdzenia stron
                ciała, parametrów, harmonogramu i potwierdzenia w formularzu przypisania.
              </p>
            )}
            {!complete && draft.exercises.length > 0 && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Niepełne lub nierozpoznane ćwiczenia dodaj ręcznie przez „Personalizuj i przypisz”. Nie wstawiamy
                brakujących parametrów.
              </p>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
