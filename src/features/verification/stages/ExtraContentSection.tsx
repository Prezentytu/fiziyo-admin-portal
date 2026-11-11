'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  EXTRA_CONTENT_GROUPS,
  countFilledExtraFields,
  readExtraList,
  readExtraText,
  type ExtraContentField as ExtraContentFieldDefinition,
  type ExtraContentGroup,
  type ExtraCoreField,
} from '../utils/extraContent';
import { ChipListEditor } from './ChipListEditor';
import { StageSection } from './StageSection';

interface ExtraContentHandlers {
  enrichment: ExerciseEnrichmentData;
  core: Record<ExtraCoreField, string>;
  onEnrichmentPathChange: (path: string, value: unknown) => void;
  onCoreFieldChange: (field: ExtraCoreField, value: string) => void;
}

interface ExtraContentSectionProps extends ExtraContentHandlers {
  /** Defaults to the legacy groups; a v3.3 record passes its own. */
  groups?: ExtraContentGroup[];
}

export function ExtraContentField({
  field,
  enrichment,
  core,
  onEnrichmentPathChange,
  onCoreFieldChange,
  onFocus,
}: Readonly<ExtraContentHandlers & { field: ExtraContentFieldDefinition; onFocus?: () => void }>) {
  const inputId = `verification-extra-${field.id}`;
  if (field.kind === 'list') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] text-label-secondary">{field.label}</p>
        <ChipListEditor
          items={readExtraList(field, enrichment)}
          onChange={(items) => onEnrichmentPathChange(field.path, items)}
          addLabel="Dodaj"
          inputLabel={field.label}
          testIdPrefix={inputId}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-[13px] text-label-secondary">
        {field.label}
      </Label>
      <Textarea
        id={inputId}
        value={readExtraText(field, enrichment, core)}
        rows={2}
        className="field-sizing-content"
        onChange={(event) =>
          field.source === 'core'
            ? onCoreFieldChange(field.field, event.target.value)
            : onEnrichmentPathChange(field.path, event.target.value)
        }
        onFocus={onFocus}
        data-testid={`${inputId}-input`}
      />
      {field.source === 'core' && field.hint && <p className="text-[13px] text-label-secondary">{field.hint}</p>}
    </div>
  );
}

export function ExtraContentGroupSection({
  group,
  ...handlers
}: Readonly<ExtraContentHandlers & { group: ExtraContentGroup }>) {
  return (
    <StageSection title={group.title} data-testid={`verification-extra-${group.id}`}>
      {group.fields.map((field) => (
        <ExtraContentField key={field.id} field={field} {...handlers} />
      ))}
    </StageSection>
  );
}

export function ExtraContentSection({ groups = EXTRA_CONTENT_GROUPS, ...handlers }: ExtraContentSectionProps) {
  const { filled, total } = countFilledExtraFields(handlers.enrichment, handlers.core, groups);

  return (
    <div className="flex flex-col gap-4" data-testid="verification-extra-content">
      <p className="px-1 text-[13px] text-label-secondary" data-testid="verification-extra-content-count">
        Pozostałe treści z karty ćwiczenia, wypełnione: {filled} z {total}. Fizjoterapeuci widzą je w katalogu, a pola
        dla pacjenta także pacjent.
      </p>
      {groups.map((group) => (
        <ExtraContentGroupSection key={group.id} group={group} {...handlers} />
      ))}
    </div>
  );
}
