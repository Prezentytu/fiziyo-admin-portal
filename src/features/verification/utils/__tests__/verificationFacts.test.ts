import { describe, expect, it } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { buildVerificationFactsV33, sideColumnDiffersFromMode, type VerificationFact } from '../verificationFacts';

const golden = goldenV33 as ExerciseEnrichmentData;
const facts = buildVerificationFactsV33({ enrichmentData: golden, side: 'Both' });

function lines(group: VerificationFact[], id: string): string[] {
  const found = group.find((fact) => fact.id === id);
  if (!found) throw new Error(`Brak faktu ${id}`);
  return found.lines;
}

describe('buildVerificationFactsV33', () => {
  it('etap Instrukcja: tylko wzorzec oddechu jest faktem; łatwiej, trudniej i zdanie o oddechu edytuje etap', () => {
    expect(facts.instruction).toEqual([]);
    const withPattern = buildVerificationFactsV33({
      enrichmentData: { ...golden, breathing: { ...golden.breathing, pattern: 'exhale_on_effort' } },
    });
    expect(lines(withPattern.instruction, 'breathing-pattern')).toEqual(['exhale_on_effort']);
  });

  it('etap Bezpieczeństwo: reguła bólu, flagi i wskazania jako kody; punkty kontrolne i uwagi edytuje etap', () => {
    expect(lines(facts.safety, 'pain-rule')).toEqual(['WS-3']);
    expect(lines(facts.safety, 'safety-flags')).toContain('supine_pregnancy');
    expect(facts.therapist.map((item) => item.id)).toEqual(['indications']);
    expect(lines(facts.therapist, 'indications')).toEqual(['osteoarthritis', 'patellofemoral_syndrome']);
  });

  it('etap Parametry: strona, sprzęt, zakresy, progresja', () => {
    expect(lines(facts.parameters, 'side-mode')).toEqual(['Na każdą stronę']);
    expect(lines(facts.parameters, 'side-per-side-dose')).toEqual(['Liczone na każdą stronę osobno']);
    expect(lines(facts.parameters, 'side-start')).toEqual(['lewa']);
    expect(lines(facts.parameters, 'equipment')).toEqual([
      'mata albo łóżko, wymagany',
      'mały zrolowany ręcznik, wymagany',
    ]);
    expect(lines(facts.parameters, 'prescription-ranges')).toContain('serie: 1–3, domyślnie 2');
    expect(lines(facts.parameters, 'prescription-ranges')).toContain('czas powtórzenia: 5–12 s, domyślnie 7 s');
    expect(lines(facts.parameters, 'prescription-progression')[1]).toMatch(/^Dalej: /);
  });

  it('etap Materiał: strona w mediach i media bez zakresu użycia', () => {
    expect(lines(facts.material, 'side-shown-in-media')).toEqual(['prawa']);
    expect(lines(facts.material, 'media')[0]).toBe('m1 · zdjęcie · own_ai · FiziYo · own');
    expect(lines(facts.material, 'media').join(' ')).not.toContain('demo_only');
  });

  it('klasyfikacja i powiązania dla każdego weryfikatora, pochodzenie i audyt tylko dla zespołu', () => {
    expect(lines(facts.classification, 'key')).toEqual(['fx-0073']);
    expect(lines(facts.classification, 'classification-muscles')).toEqual(['główne: quadriceps']);
    expect(lines(facts.classification, 'relations')[0]).toBe(
      'progression → fx-0173: kolano prostuje się nad wałkiem, pięta unosi się wyraźnie'
    );
    expect(lines(facts.team, 'provenance-sources')).toEqual(['h2g · h2g-17392 · movement', 'own · fx-0073 · text']);
    expect(lines(facts.team, 'media-usage-scope')).toContain('m5: demo_only');
    expect(lines(facts.team, 'lifecycle-availability')).toEqual(['demo']);
    expect(lines(facts.team, 'lifecycle-findings')).toHaveLength(7);
  });

  it('pusty dokument daje fakty bez linii zamiast błędu', () => {
    const empty = buildVerificationFactsV33({ enrichmentData: { schemaVersion: '3.3' } });

    expect(
      Object.values(empty)
        .flat()
        .every((fact) => fact.lines.length === 0)
    ).toBe(true);
  });
});

describe('sideColumnDiffersFromMode', () => {
  it('kolumna „both” odpowiada trybowi each_side', () => {
    expect(sideColumnDiffersFromMode('Both', 'each_side')).toBe(false);
    expect(sideColumnDiffersFromMode('none', 'each_side')).toBe(true);
    expect(sideColumnDiffersFromMode('', 'none')).toBe(false);
  });

  it('nie zgłasza różnicy, gdy dokument nie podaje trybu albo podaje nieznany', () => {
    expect(sideColumnDiffersFromMode('both', null)).toBe(false);
    expect(sideColumnDiffersFromMode('both', 'mirror')).toBe(false);
  });
});
