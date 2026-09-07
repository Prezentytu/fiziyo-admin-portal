'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useVisitListening } from './useVisitListening';
import { visitRequest, type VisitDraft, type VisitExercise, type VisitNote } from './visitService';

const labels: Record<keyof VisitNote, string> = { subjective: 'Wywiad', objective: 'Badanie', assessment: 'Ocena', plan: 'Plan terapii' };
export function VisitPanel({ patientId, organizationId, onPlan, onSaved }: {
  patientId: string; organizationId: string; onPlan: (exercises: VisitExercise[]) => void; onSaved?: () => void;
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
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function generate() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await visitRequest<VisitDraft>('visit-draft', { patientId, organizationId, transcript: capture.transcript }, abort.signal);
      setDraft(result); setInstructions(result.instructions.map(item => item.text).join('\n')); setReviewed(false);
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Błąd przygotowania szkicu.'); }
    finally { pending.current = false; setBusy(false); }
  }
  async function save() {
    if (!draft || !reviewed || pending.current || saved) return;
    pending.current = true; setBusy(true); setError(''); setSaveAttempted(true);
    requestId.current ??= crypto.randomUUID();
    const abort = new AbortController(); controller.current = abort;
    try {
      await visitRequest('visit-note', { patientId, organizationId, requestId: requestId.current, note: draft.note, instructions }, abort.signal);
      setSaved(true); onSaved?.();
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : 'Błąd zapisu. Ponów ten sam zapis.'); }
    finally { pending.current = false; setBusy(false); }
  }
  const complete = draft?.exercises.length && draft.exercises.every(e => e.exerciseId && e.sets && (e.reps || e.duration));
  return <section className="rounded-2xl border bg-card p-5 space-y-4" aria-label="Asystent wizyty">
    <h2 className="text-lg font-semibold">Wizyta AI · wersja testowa</h2>
    <p className="text-sm text-muted-foreground">Prowadzisz wizytę, potem sprawdzasz notatkę i ćwiczenia. Testuj na rozmowach syntetycznych. Rozpoznawanie mowy może korzystać z usługi dostawcy przeglądarki. Tekst pozostaje w pamięci tej karty — odświeżenie lub opuszczenie pacjenta go usuwa.</p>
    {!draft && <>
      <label className="flex items-center gap-2 text-sm"><input data-testid="visit-consent" type="checkbox" checked={consent} disabled={listening} onChange={e => setConsent(e.target.checked)} />Uczestnicy wiedzą o słuchaniu i zgodzili się na nie.</label>
      <div className="flex flex-wrap items-center gap-2">
        <Button data-testid="visit-start" disabled={!consent || !capture.supported || listening || busy} onClick={capture.start}>Rozpocznij / wznów słuchanie</Button>
        <Button data-testid="visit-pause" variant="outline" disabled={!listening || capture.state === 'stopping'} onClick={capture.pause}>Zakończ słuchanie</Button>
        <span role="status">{listening ? 'Słuchanie' : 'Słuchanie wyłączone'} · {Math.floor(capture.seconds / 60)}:{String(capture.seconds % 60).padStart(2, '0')}</span>
      </div>
      {!capture.supported && <p>Brak obsługi mikrofonu w tej przeglądarce. Możesz wpisać transkrypt.</p>}
      {capture.error && <p role="alert">{capture.error}</p>}
      <label className="block">Transkrypt<Textarea data-testid="visit-transcript" value={capture.transcript} maxLength={40000} disabled={listening || busy} rows={7} onChange={e => capture.setTranscript(e.target.value)} /></label>
      {capture.interim && <p className="text-muted-foreground" aria-live="polite">{capture.interim}</p>}
      <Button data-testid="visit-generate" disabled={listening || busy || capture.transcript.trim().length < 20 || capture.transcript.length > 40000} onClick={generate}>{busy ? 'Przygotowywanie…' : 'Przygotuj szkic wizyty'}</Button>
    </>}
    {draft && <>
      <p className="text-sm">Szkic wymaga sprawdzenia z rozmową. Cytat potwierdza źródło tekstu, nie gwarantuje poprawności interpretacji AI.</p>
      {draft.missingInformation.length > 0 && <ul className="list-disc pl-5">{draft.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {(Object.keys(labels) as (keyof VisitNote)[]).map(section => <div key={section}>
        <label>{labels[section]}<Textarea data-testid={`visit-${section}`} value={draft.note[section]} disabled={saveAttempted || busy} onChange={e => { setReviewed(false); setDraft({ ...draft, note: { ...draft.note, [section]: e.target.value } }); }} /></label>
        <details><summary data-testid={`visit-source-${section}`}>Źródła z rozmowy</summary>{draft.evidence.filter(e => e.section === section).map((e, i) => <blockquote key={i}>{e.sourceQuote}</blockquote>)}</details>
      </div>)}
      <label className="block">Zalecenia domowe<Textarea data-testid="visit-instructions" value={instructions} disabled={saveAttempted || busy} onChange={e => { setInstructions(e.target.value); setReviewed(false); }} /></label>
      {draft.exercises.map((e, i) => <div key={i} className="rounded-lg border p-3"><strong>{e.name}</strong><p>Serie: {e.sets ?? 'do ustalenia'} · Powtórzenia: {e.reps ?? '—'} · Czas: {e.duration ?? '—'} s · {e.frequency ?? 'częstotliwość do ustalenia'}</p><p className="text-sm text-muted-foreground">{e.sourceQuote}</p></div>)}
      <label className="flex gap-2"><input data-testid="visit-reviewed" type="checkbox" checked={reviewed} disabled={saveAttempted} onChange={e => setReviewed(e.target.checked)} />Sprawdziłem treść i poprawiłem błędy.</label>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="visit-save" onClick={save} disabled={!reviewed || busy || saved}>{saved ? 'Notatka zapisana' : saveAttempted ? 'Ponów ten sam zapis' : 'Zapisz sprawdzoną notatkę'}</Button>
        <Button data-testid="visit-assign-plan" variant="outline" disabled={!saved || !complete} onClick={() => onPlan(draft.exercises)}>Przejdź do przypisania ćwiczeń</Button>
      </div>
      {saved && <p role="status">Notatka zapisana jako edytowalny szkic w dokumentacji pacjenta. Plan wymaga osobnego sprawdzenia stron ciała, parametrów, harmonogramu i potwierdzenia w formularzu przypisania.</p>}
      {!complete && draft.exercises.length > 0 && <p>Niepełne lub nierozpoznane ćwiczenia dodaj ręcznie przez „Personalizuj i przypisz”. Nie wstawiamy brakujących parametrów.</p>}
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </section>;
}
