'use client';

import { Plus, Trash2, HeartPulse, ShieldAlert, Stethoscope, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { TherapistNotesSection } from '@/components/shared/enrichment/TherapistNotesSection';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import { cn } from '@/lib/utils';
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Function to check whether an enrichment path differs from the saved baseline. */
type IsPathDirty = (path: string) => boolean;

function hasText(value: string | undefined | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

function hasListItems(values: string[] | undefined): boolean {
  return Boolean(values?.some((value) => hasText(value)));
}

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  testId: string;
}

function SectionCard({ title, icon, children, testId }: Readonly<SectionCardProps>) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-surface/50 p-4 sm:p-6" data-testid={testId}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

interface EditableTextBlockProps {
  label: string;
  value: string;
  placeholder: string;
  editable: boolean;
  disabled?: boolean;
  minHeight?: string;
  emptyText: string;
  dirty?: boolean;
  onChange: (value: string) => void;
  testId: string;
}

function EditableTextBlock({
  label,
  value,
  placeholder,
  editable,
  disabled = false,
  minHeight = 'min-h-[100px]',
  emptyText,
  dirty = false,
  onChange,
  testId,
}: Readonly<EditableTextBlockProps>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <DirtyDot active={editable && dirty} />
      </div>
      {editable ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            `${minHeight} text-sm transition-colors`,
            dirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
          )}
          onChange={(event) => onChange(event.target.value)}
          data-testid={testId}
        />
      ) : hasText(value) ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60">{emptyText}</p>
      )}
    </div>
  );
}

// ============================================================
// Patient — instrukcja wiodąca (opis + podsumowanie)
// ============================================================

interface PatientLeadSectionProps {
  data: ExerciseEnrichmentData;
  patientDescription: string;
  editable: boolean;
  disabled?: boolean;
  patientDescriptionDirty: boolean;
  isPathDirty: IsPathDirty;
  onPatientDescriptionChange: (value: string) => void;
  setPath: (path: string, value: unknown) => void;
}

export function PatientLeadSection({
  data,
  patientDescription,
  editable,
  disabled = false,
  patientDescriptionDirty,
  isPathDirty,
  onPatientDescriptionChange,
  setPath,
}: Readonly<PatientLeadSectionProps>) {
  const summary = data.patient?.summary ?? '';
  const hasReadContent = hasText(patientDescription) || hasText(summary);
  if (!editable && !hasReadContent) return null;

  return (
    <SectionCard
      title="Instrukcja dla pacjenta"
      icon={<HeartPulse className="h-4 w-4 text-muted-foreground" />}
      testId="exercise-detail-patient-lead"
    >
      <EditableTextBlock
        label="Opis dla pacjenta"
        value={patientDescription}
        placeholder="Prostym językiem: co pacjent ma zrobić i na co uważać."
        editable={editable}
        disabled={disabled}
        emptyText="Brak opisu dla pacjenta."
        dirty={patientDescriptionDirty}
        onChange={onPatientDescriptionChange}
        testId="exercise-detail-patient-description-input"
      />
      <EditableTextBlock
        label="Krótkie podsumowanie"
        value={summary}
        placeholder="Jedno–dwa zdania streszczenia dla szybkiego podglądu w aplikacji."
        editable={editable}
        disabled={disabled}
        minHeight="min-h-[70px]"
        emptyText="—"
        dirty={isPathDirty('patient.summary')}
        onChange={(value) => setPath('patient.summary', value)}
        testId="exercise-detail-patient-summary-input"
      />
    </SectionCard>
  );
}

// ============================================================
// Patient — dodatkowe (typowe błędy, odczucia, dlaczego/kiedy)
// ============================================================

function MistakesEditor({
  items,
  dirty,
  disabled = false,
  onChange,
}: Readonly<{
  items: EnrichmentPatientMistakeV3[];
  dirty: boolean;
  disabled?: boolean;
  onChange: (items: EnrichmentPatientMistakeV3[]) => void;
}>) {
  const safeItems = items.length > 0 ? items : [{ mistake: '', fix: '' }];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">Typowe błędy i korekty</Label>
          <DirtyDot active={dirty} />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...items, { mistake: '', fix: '' }])}
          data-testid="exercise-detail-add-mistake-btn"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Dodaj błąd
        </Button>
      </div>
      {safeItems.map((item, index) => (
        <div key={`mistake-${index}`} className="space-y-1.5 rounded-lg border border-border/40 p-2.5">
          <div className="flex min-w-0 gap-2">
            <Input
              value={item.mistake ?? ''}
              placeholder="Błąd"
              disabled={disabled}
              className="min-w-0 w-full"
              onChange={(event) => {
                const next = [...safeItems];
                next[index] = { ...next[index], mistake: event.target.value };
                onChange(next);
              }}
              data-testid={`exercise-detail-mistake-text-${index}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Usuń błąd"
              disabled={disabled}
              onClick={() => onChange(safeItems.filter((_, entryIndex) => entryIndex !== index))}
              data-testid={`exercise-detail-mistake-remove-${index}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Input
            value={item.fix ?? ''}
            placeholder="Jak poprawić"
            disabled={disabled}
            onChange={(event) => {
              const next = [...safeItems];
              next[index] = { ...next[index], fix: event.target.value };
              onChange(next);
            }}
            data-testid={`exercise-detail-mistake-fix-${index}`}
          />
        </div>
      ))}
    </div>
  );
}

interface PatientExtrasSectionProps {
  data: ExerciseEnrichmentData;
  editable: boolean;
  disabled?: boolean;
  isPathDirty: IsPathDirty;
  setPath: (path: string, value: unknown) => void;
}

export function PatientExtrasSection({
  data,
  editable,
  disabled = false,
  isPathDirty,
  setPath,
}: Readonly<PatientExtrasSectionProps>) {
  const mistakes = data.patient?.mistakes ?? [];
  const shouldFeel = data.patient?.should_feel ?? '';
  const shouldNotFeel = data.patient?.should_not_feel ?? '';
  const why = data.patient?.why ?? '';
  const whenToDo = data.patient?.when_to_do ?? '';

  const hasAnyReadContent =
    mistakes.length > 0 || hasText(shouldFeel) || hasText(shouldNotFeel) || hasText(why) || hasText(whenToDo);

  if (!editable && !hasAnyReadContent) return null;

  return (
    <SectionCard title="Odczucia i typowe błędy" icon={<HeartPulse className="h-4 w-4 text-muted-foreground" />} testId="exercise-detail-patient-extras">
      {editable ? (
        <div className="space-y-4">
          <MistakesEditor
            items={mistakes}
            dirty={isPathDirty('patient.mistakes')}
            disabled={disabled}
            onChange={(items) => setPath('patient.mistakes', items)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditableTextBlock
              label="Co pacjent powinien czuć"
              value={shouldFeel}
              placeholder="np. lekkie napięcie mięśni pośladkowych"
              editable
              disabled={disabled}
              minHeight="min-h-[70px]"
              emptyText="—"
              dirty={isPathDirty('patient.should_feel')}
              onChange={(value) => setPath('patient.should_feel', value)}
              testId="exercise-detail-should-feel-input"
            />
            <EditableTextBlock
              label="Czego nie powinien czuć"
              value={shouldNotFeel}
              placeholder="np. ostrego bólu w kolanie"
              editable
              disabled={disabled}
              minHeight="min-h-[70px]"
              emptyText="—"
              dirty={isPathDirty('patient.should_not_feel')}
              onChange={(value) => setPath('patient.should_not_feel', value)}
              testId="exercise-detail-should-not-feel-input"
            />
          </div>
          <EditableTextBlock
            label="Dlaczego to ćwiczenie"
            value={why}
            placeholder="Krótkie uzasadnienie dla pacjenta"
            editable
            disabled={disabled}
            minHeight="min-h-[70px]"
            emptyText="—"
            dirty={isPathDirty('patient.why')}
            onChange={(value) => setPath('patient.why', value)}
            testId="exercise-detail-why-input"
          />
          <EditableTextBlock
            label="Kiedy wykonywać"
            value={whenToDo}
            placeholder="np. rano i wieczorem, po rozgrzewce"
            editable
            disabled={disabled}
            minHeight="min-h-[64px]"
            emptyText="—"
            dirty={isPathDirty('patient.when_to_do')}
            onChange={(value) => setPath('patient.when_to_do', value)}
            testId="exercise-detail-when-to-do-input"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.length > 0 && (
            <div className="space-y-2">
              {mistakes.map((mistake, index) => (
                <div key={`${mistake.mistake ?? ''}-${index}`} className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Błąd:</span> {mistake.mistake || 'Brak opisu'}
                  </p>
                  {hasText(mistake.fix) && (
                    <p>
                      <span className="font-medium text-foreground">Korekta:</span> {mistake.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {hasText(shouldFeel) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Powinno być odczuwalne:</span> {shouldFeel}
            </p>
          )}
          {hasText(shouldNotFeel) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nie powinno dawać:</span> {shouldNotFeel}
            </p>
          )}
          {hasText(why) && <p className="text-sm text-muted-foreground">{why}</p>}
          {hasText(whenToDo) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Kiedy wykonywać:</span> {whenToDo}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Bezpieczeństwo
// ============================================================

interface SafetySectionProps {
  data: ExerciseEnrichmentData;
  editable: boolean;
  disabled?: boolean;
  isPathDirty: IsPathDirty;
  setPath: (path: string, value: unknown) => void;
}

export function SafetySection({
  data,
  editable,
  disabled = false,
  isPathDirty,
  setPath,
}: Readonly<SafetySectionProps>) {
  const stopIf = data.safety?.stop_if ?? '';
  const intensityGuide = data.safety?.intensity_guide ?? '';
  const requiresSupervision = Boolean(data.safety?.requires_supervision);

  const hasAnyReadContent = hasText(stopIf) || hasText(intensityGuide) || requiresSupervision;
  if (!editable && !hasAnyReadContent) return null;

  return (
    <SectionCard title="Bezpieczeństwo" icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />} testId="exercise-detail-safety">
      {editable ? (
        <div className="space-y-4">
          <EditableTextBlock
            label="Przerwij ćwiczenie, gdy..."
            value={stopIf}
            placeholder="np. pojawi się ostry ból lub zawroty głowy"
            editable
            disabled={disabled}
            minHeight="min-h-[70px]"
            emptyText="—"
            dirty={isPathDirty('safety.stop_if')}
            onChange={(value) => setPath('safety.stop_if', value)}
            testId="exercise-detail-stop-if-input"
          />
          <EditableTextBlock
            label="Wskazówki dot. intensywności"
            value={intensityGuide}
            placeholder="np. utrzymuj intensywność 5–6/10 w skali odczuwanego wysiłku"
            editable
            disabled={disabled}
            minHeight="min-h-[70px]"
            emptyText="—"
            dirty={isPathDirty('safety.intensity_guide')}
            onChange={(value) => setPath('safety.intensity_guide', value)}
            testId="exercise-detail-intensity-guide-input"
          />
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 transition-colors',
              isPathDirty('safety.requires_supervision')
                ? 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
                : 'border-border/50'
            )}
          >
            <Switch
              checked={requiresSupervision}
              disabled={disabled}
              onCheckedChange={(checked) => setPath('safety.requires_supervision', checked)}
              data-testid="exercise-detail-requires-supervision-switch"
            />
            <Label>Wymaga nadzoru fizjoterapeuty</Label>
            <DirtyDot active={isPathDirty('safety.requires_supervision')} className="ml-auto" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {requiresSupervision && (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Wymaga nadzoru fizjoterapeuty</p>
          )}
          {hasText(stopIf) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przerwij gdy:</span> {stopIf}
            </p>
          )}
          {hasText(intensityGuide) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Intensywność:</span> {intensityGuide}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Dla terapeuty (opis kliniczny core + notatki v3)
// ============================================================

interface TherapistSectionProps {
  data: ExerciseEnrichmentData;
  clinicalDescription: string;
  editable: boolean;
  disabled?: boolean;
  clinicalDescriptionDirty: boolean;
  onClinicalDescriptionChange: (value: string) => void;
  setPath: (path: string, value: unknown) => void;
  persist: () => Promise<void>;
}

export function TherapistSection({
  data,
  clinicalDescription,
  editable,
  disabled = false,
  clinicalDescriptionDirty,
  onClinicalDescriptionChange,
  setPath,
  persist,
}: Readonly<TherapistSectionProps>) {
  const therapist = data.therapist ?? {};
  const hasTherapistReadContent =
    hasText(clinicalDescription) ||
    hasText(therapist.clinical_notes) ||
    hasListItems(therapist.indications) ||
    hasListItems(therapist.contraindications) ||
    hasListItems(therapist.rehab_phases) ||
    hasListItems(therapist.clinical_benefits) ||
    hasText(therapist.progression_notes);

  if (!editable && !hasTherapistReadContent) return null;

  return (
    <SectionCard title="Dla fizjoterapeuty" icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />} testId="exercise-detail-therapist">
      <EditableTextBlock
        label="Opis kliniczny"
        value={clinicalDescription}
        placeholder="Cel, biomechanika, uwagi terapeutyczne (język medyczny)."
        editable={editable}
        disabled={disabled}
        emptyText="Brak opisu klinicznego."
        dirty={clinicalDescriptionDirty}
        onChange={onClinicalDescriptionChange}
        testId="exercise-detail-clinical-description-input"
      />

      {editable ? (
        <TherapistNotesSection draft={data} disabled={disabled} setPath={setPath} persist={persist} />
      ) : (
        <div className="space-y-2">
          {hasText(therapist.clinical_notes) && (
            <p className="text-sm text-muted-foreground">{therapist.clinical_notes}</p>
          )}
          {hasListItems(therapist.indications) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Wskazania:</span> {(therapist.indications ?? []).join(', ')}
            </p>
          )}
          {hasListItems(therapist.contraindications) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Przeciwwskazania:</span>{' '}
              {(therapist.contraindications ?? []).join(', ')}
            </p>
          )}
          {hasListItems(therapist.rehab_phases) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Faza rehab:</span> {(therapist.rehab_phases ?? []).join(', ')}
            </p>
          )}
          {hasListItems(therapist.clinical_benefits) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Korzyści kliniczne:</span>{' '}
              {(therapist.clinical_benefits ?? []).join(', ')}
            </p>
          )}
          {hasText(therapist.progression_notes) && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Progresja:</span> {therapist.progression_notes}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Metadane (AI, sprzęt, film, notatki)
// ============================================================

interface MetadataSectionProps {
  data: ExerciseEnrichmentData;
  videoUrl: string;
  notes: string;
  editable: boolean;
  disabled?: boolean;
  videoUrlDirty: boolean;
  notesDirty: boolean;
  isPathDirty: IsPathDirty;
  onVideoUrlChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  setPath: (path: string, value: unknown) => void;
}

function ReadChips({ label, items }: Readonly<{ label: string; items: string[] }>) {
  if (!hasListItems(items)) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.filter((item) => hasText(item)).map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MetadataSection({
  data,
  videoUrl,
  notes,
  editable,
  disabled = false,
  videoUrlDirty,
  notesDirty,
  isPathDirty,
  onVideoUrlChange,
  onNotesChange,
  setPath,
}: Readonly<MetadataSectionProps>) {
  const equipment = data.equipment ?? [];
  const keywords = data.ai?.keywords ?? [];
  const problems = data.ai?.problems ?? [];
  const suitableFor = data.ai?.suitable_for ?? [];
  const contraindicatedFor = data.ai?.contraindicated_for ?? [];

  const hasReadContent =
    hasText(videoUrl) ||
    hasText(notes) ||
    hasListItems(equipment) ||
    hasListItems(keywords) ||
    hasListItems(problems) ||
    hasListItems(suitableFor) ||
    hasListItems(contraindicatedFor);

  if (!editable && !hasReadContent) return null;

  return (
    <SectionCard title="Metadane i wyszukiwanie" icon={<Tags className="h-4 w-4 text-muted-foreground" />} testId="exercise-detail-metadata">
      {editable ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground" htmlFor="exercise-detail-video-url">
                Link do filmu
              </Label>
              <DirtyDot active={videoUrlDirty} />
            </div>
            <Input
              id="exercise-detail-video-url"
              value={videoUrl}
              placeholder="https://..."
              onChange={(event) => onVideoUrlChange(event.target.value)}
              disabled={disabled}
              className={cn(
                'h-9 text-sm transition-colors',
                videoUrlDirty && 'border-amber-400/70 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5'
              )}
              data-testid="exercise-detail-video-url-input"
            />
          </div>
          <EditableTextBlock
            label="Notatki wewnętrzne"
            value={notes}
            placeholder="Dodatkowe uwagi terapeuty (niewidoczne dla pacjenta)."
            editable
            disabled={disabled}
            minHeight="min-h-[70px]"
            emptyText="—"
            dirty={notesDirty}
            onChange={onNotesChange}
            testId="exercise-detail-notes-input"
          />
          <ListEditor
            title="Potrzebny sprzęt"
            items={equipment}
            placeholder="np. mata do ćwiczeń"
            addLabel="Dodaj sprzęt"
            disabled={disabled}
            dirty={isPathDirty('equipment')}
            onChange={(items) => setPath('equipment', items)}
            testIdPrefix="exercise-detail-equipment"
          />
          <ListEditor
            title="Problemy / dolegliwości (AI)"
            items={problems}
            placeholder="np. ból odcinka lędźwiowego"
            addLabel="Dodaj problem"
            disabled={disabled}
            dirty={isPathDirty('ai.problems')}
            onChange={(items) => setPath('ai.problems', items)}
            testIdPrefix="exercise-detail-ai-problems"
          />
          <ListEditor
            title="Odpowiednie dla (AI)"
            items={suitableFor}
            placeholder="np. osoby po siedzącej pracy"
            addLabel="Dodaj grupę"
            disabled={disabled}
            dirty={isPathDirty('ai.suitable_for')}
            onChange={(items) => setPath('ai.suitable_for', items)}
            testIdPrefix="exercise-detail-ai-suitable"
          />
          <ListEditor
            title="Przeciwwskazane dla (AI)"
            items={contraindicatedFor}
            placeholder="np. ostry stan zapalny"
            addLabel="Dodaj przeciwwskazanie"
            disabled={disabled}
            dirty={isPathDirty('ai.contraindicated_for')}
            onChange={(items) => setPath('ai.contraindicated_for', items)}
            testIdPrefix="exercise-detail-ai-contraindicated"
          />
          <ListEditor
            title="Słowa kluczowe (AI)"
            items={keywords}
            placeholder="np. stabilizacja centralna"
            addLabel="Dodaj słowo kluczowe"
            disabled={disabled}
            dirty={isPathDirty('ai.keywords')}
            onChange={(items) => setPath('ai.keywords', items)}
            testIdPrefix="exercise-detail-ai-keywords"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {hasText(videoUrl) && (
            <p className="truncate text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Film:</span> {videoUrl}
            </p>
          )}
          {hasText(notes) && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notatki:</span> {notes}
            </p>
          )}
          <ReadChips label="Potrzebny sprzęt" items={equipment} />
          <ReadChips label="Problemy / dolegliwości" items={problems} />
          <ReadChips label="Odpowiednie dla" items={suitableFor} />
          <ReadChips label="Przeciwwskazane dla" items={contraindicatedFor} />
          <ReadChips label="Słowa kluczowe" items={keywords} />
        </div>
      )}
    </SectionCard>
  );
}
