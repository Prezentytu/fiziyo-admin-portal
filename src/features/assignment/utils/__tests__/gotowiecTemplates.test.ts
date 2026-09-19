import { describe, expect, it } from 'vitest';
import type { ExerciseSet, WizardStepConfig } from '../../types';
import {
  availableClinicalCases,
  canFastAssignGotowiec,
  clinicalCasesForSet,
  filterGotowce,
  isFiziyoVerifiedTemplate,
  mergeTemplateSets,
  nextWizardStepAfterGotowiecSelect,
  partitionAssignableSets,
} from '../gotowiecTemplates';

function set(overrides: Partial<ExerciseSet> & Pick<ExerciseSet, 'id' | 'name'>): ExerciseSet {
  return {
    kind: 'TEMPLATE',
    isTemplate: true,
    exerciseMappings: [{ id: `m-${overrides.id}`, exerciseId: 'e1', exercise: { id: 'e1', name: 'Przysiad' } }],
    ...overrides,
  };
}

const fromPatientSteps: WizardStepConfig[] = [
  { id: 'select-set', label: 'Zestaw', description: '' },
  { id: 'customize-set', label: 'Plan', description: '' },
  { id: 'schedule', label: 'Harmonogram', description: '' },
  { id: 'summary', label: 'Podsumowanie', description: '' },
];

const withPatientsSteps: WizardStepConfig[] = [
  { id: 'select-set', label: 'Zestaw', description: '' },
  { id: 'customize-set', label: 'Plan', description: '' },
  { id: 'select-patients', label: 'Pacjenci', description: '' },
  { id: 'schedule', label: 'Harmonogram', description: '' },
  { id: 'summary', label: 'Podsumowanie', description: '' },
];

describe('isFiziyoVerifiedTemplate', () => {
  it('accepts TEMPLATE + FIZIYO_VERIFIED', () => {
    expect(
      isFiziyoVerifiedTemplate(set({ id: '1', name: 'Kolano', templateSource: 'FIZIYO_VERIFIED' }))
    ).toBe(true);
  });

  it('rejects org-private templates and patient plans', () => {
    expect(
      isFiziyoVerifiedTemplate(set({ id: '2', name: 'Mój', templateSource: 'ORGANIZATION_PRIVATE' }))
    ).toBe(false);
    expect(
      isFiziyoVerifiedTemplate({
        kind: 'PATIENT_PLAN',
        isTemplate: false,
        templateSource: 'FIZIYO_VERIFIED',
      })
    ).toBe(false);
  });
});

describe('canFastAssignGotowiec', () => {
  it('requires verified source and at least one exercise', () => {
    expect(
      canFastAssignGotowiec(set({ id: '1', name: 'Kolano', templateSource: 'FIZIYO_VERIFIED' }))
    ).toBe(true);
    expect(
      canFastAssignGotowiec(
        set({ id: '2', name: 'Pusty', templateSource: 'FIZIYO_VERIFIED', exerciseMappings: [] })
      )
    ).toBe(false);
    expect(
      canFastAssignGotowiec(set({ id: '3', name: 'Org', templateSource: 'ORGANIZATION_PRIVATE' }))
    ).toBe(false);
  });
});

describe('clinicalCasesForSet / filterGotowce', () => {
  const kolano = set({
    id: 'k',
    name: 'Kolano skoczka',
    description: 'Po urazie',
    templateSource: 'FIZIYO_VERIFIED',
  });
  const bark = set({
    id: 'b',
    name: 'Stabilizacja barku',
    templateSource: 'FIZIYO_VERIFIED',
    exerciseMappings: [
      { id: 'm-b', exerciseId: 'e2', exercise: { id: 'e2', name: 'Rotacja zewnętrzna barku' } },
    ],
  });
  const core = set({
    id: 'c',
    name: 'Core tydzień 1',
    templateSource: 'FIZIYO_VERIFIED',
  });

  it('matches case chips from name and exercise titles', () => {
    expect(clinicalCasesForSet(kolano).map((chip) => chip.id)).toEqual(['kolano']);
    expect(clinicalCasesForSet(bark).map((chip) => chip.id)).toEqual(['bark']);
    expect(clinicalCasesForSet(core)).toEqual([]);
  });

  it('lists only chips present in the current templates', () => {
    expect(availableClinicalCases([kolano, bark, core]).map((chip) => chip.id)).toEqual(['kolano', 'bark']);
  });

  it('filters by query across name, description and exercise names', () => {
    expect(filterGotowce([kolano, bark, core], 'skoczka', null).map((item) => item.id)).toEqual(['k']);
    expect(filterGotowce([kolano, bark, core], 'rotacja', null).map((item) => item.id)).toEqual(['b']);
  });

  it('filters by clinical case chip', () => {
    expect(filterGotowce([kolano, bark, core], '', 'kolano').map((item) => item.id)).toEqual(['k']);
    expect(filterGotowce([kolano, bark, core], 'core', 'kolano')).toEqual([]);
  });
});

describe('partitionAssignableSets / mergeTemplateSets', () => {
  it('splits FiziyoVerified from organization templates', () => {
    const fiziyo = set({ id: 'f', name: 'Gotowiec', templateSource: 'FIZIYO_VERIFIED' });
    const org = set({ id: 'o', name: 'Gabinet', templateSource: 'ORGANIZATION_PRIVATE' });
    const partitioned = partitionAssignableSets([org, fiziyo]);
    expect(partitioned.gotowce.map((item) => item.id)).toEqual(['f']);
    expect(partitioned.otherTemplates.map((item) => item.id)).toEqual(['o']);
  });

  it('dedupes by id preferring the fiziyo catalog copy', () => {
    const catalog = set({ id: 'same', name: 'Katalog', templateSource: 'FIZIYO_VERIFIED' });
    const local = set({ id: 'same', name: 'Lokalna kopia', templateSource: 'FIZIYO_VERIFIED' });
    const extra = set({ id: 'org', name: 'Org', templateSource: 'ORGANIZATION_PRIVATE' });
    const merged = mergeTemplateSets([local, extra], [catalog]);
    expect(merged.map((item) => item.id)).toEqual(['same', 'org']);
    expect(merged[0]?.name).toBe('Katalog');
  });
});

describe('nextWizardStepAfterGotowiecSelect', () => {
  it('skips customize and schedule when the patient is already selected', () => {
    expect(nextWizardStepAfterGotowiecSelect(fromPatientSteps, 'select-set')).toBe('summary');
  });

  it('lands on select-patients when the patient is not preselected', () => {
    expect(nextWizardStepAfterGotowiecSelect(withPatientsSteps, 'select-set')).toBe('select-patients');
  });
});
