import { describe, expect, it } from 'vitest';

import { enrichmentSchema } from '../enrichment';
import { EXTRA_CONTENT_GROUPS, countFilledExtraFields, isExtraFieldFilled, readExtraList } from '../extraContent';

const EMPTY_CORE = { audioCue: '', notes: '' };
const FIELDS = EXTRA_CONTENT_GROUPS.flatMap((group) => group.fields);

/** Paths the five stages already edit (Instruction and Safety). */
const STAGE_PATHS = new Set([
  '$schema',
  'patient.steps',
  'patient.cues',
  'patient.mistakes',
  'safety.stop_if',
  'safety.requires_supervision',
  'therapist.indications',
  'therapist.contraindications',
]);

function schemaPaths(): string[] {
  return Object.entries(enrichmentSchema.shape).flatMap(([key, value]) => {
    const inner = 'unwrap' in value ? value.unwrap() : value;
    return 'shape' in inner ? Object.keys(inner.shape).map((child) => `${key}.${child}`) : [key];
  });
}

describe('pozostałe treści w weryfikacji', () => {
  it('pokazują każde pole enrichment, którego nie ma w etapach', () => {
    const listed = new Set(FIELDS.flatMap((field) => (field.source === 'enrichment' ? [field.path] : [])));
    const missing = schemaPaths().filter((path) => !STAGE_PATHS.has(path) && !listed.has(path));

    expect(schemaPaths()).toContain('patient.why');
    expect(schemaPaths()).toContain('ai.keywords');
    expect(missing).toEqual([]);
  });

  it('liczą wypełnione pola bez pustych tekstów i list', () => {
    const result = countFilledExtraFields(
      {
        patient: { summary: 'Wzmacnia pośladki', why: '  ' },
        equipment: ['', ' '],
        ai: { keywords: ['przysiad'] },
      },
      { audioCue: '', notes: 'Uwaga na kolano' }
    );

    expect(result).toEqual({ filled: 3, total: FIELDS.length });
  });

  it('czyta listę tylko z tekstów', () => {
    const keywords = FIELDS.find((field) => field.id === 'keywords');
    if (!keywords) throw new Error('keywords field missing');

    expect(readExtraList(keywords, { ai: { keywords: ['kolano', 3 as unknown as string] } })).toEqual(['kolano']);
    expect(isExtraFieldFilled(keywords, {}, EMPTY_CORE)).toBe(false);
  });
});
