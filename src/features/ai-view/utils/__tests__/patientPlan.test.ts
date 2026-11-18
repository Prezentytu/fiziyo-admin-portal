import { describe, expect, it } from 'vitest';

import { contextPlanFacts, summarizePatientPlans, type PlanAssignmentSource } from '../patientPlan';

const knee: PlanAssignmentSource = {
  id: 'pa-knee',
  status: 'active',
  assignedAt: '2026-11-02T10:00:00Z',
  endDate: '2026-12-13',
  exerciseOverrides: JSON.stringify({ 'map-2': { reps: 12 }, 'map-3': { hidden: true } }),
  exerciseSet: {
    id: 'set-knee',
    name: 'Kolano faza 2',
    exerciseMappings: [
      { id: 'map-2', order: 2, sets: 3, reps: 10, exercise: { name: 'Przysiad', type: 'reps' } },
      { id: 'map-1', order: 1, sets: 2, duration: 30, exercise: { name: 'Deska', type: 'time' } },
      { id: 'map-3', order: 3, sets: 3, reps: 8, exercise: { name: 'Mostek', type: 'reps' } },
    ],
  },
};

describe('summarizePatientPlans', () => {
  it('lists what the patient sees, in order, with their own dose and this week', () => {
    const [plan] = summarizePatientPlans(
      [knee],
      [{ assignmentId: 'pa-knee', targetSessions: 3, completedSessions: 1 }]
    );

    expect(plan.name).toBe('Kolano faza 2');
    expect(plan.exercises).toEqual([
      { mappingId: 'map-1', name: 'Deska', dose: '2 × 30 sekund' },
      { mappingId: 'map-2', name: 'Przysiad', dose: '3 × 12' },
    ]);
    expect(plan.thisWeek).toEqual({ completed: 1, target: 3 });
  });

  it('keeps only current plans, newest first, and survives broken overrides', () => {
    const plans = summarizePatientPlans([
      { ...knee, id: 'pa-old', status: 'completed' },
      { ...knee, id: 'pa-paused', status: 'paused' },
      { ...knee, id: 'pa-new', assignedAt: '2026-11-10T10:00:00Z', exerciseOverrides: '{broken' },
      knee,
      { id: 'pa-single', status: 'active', exerciseSet: null },
    ]);

    expect(plans.map((plan) => plan.assignmentId)).toEqual(['pa-new', 'pa-knee']);
    expect(plans[0].exercises).toHaveLength(3);
    expect(plans[0].thisWeek).toBeUndefined();
  });

  it('names the dose "na każdą stronę" for alternating exercises of a 3.3 record only', () => {
    const plan = (record: object) =>
      summarizePatientPlans([
        {
          id: 'pa-alt',
          status: 'active',
          exerciseSet: {
            id: 'set-alt',
            name: 'Biodro',
            exerciseMappings: [
              {
                id: 'm1',
                order: 1,
                sets: 3,
                reps: 10,
                exercise: { name: 'Wykrok', type: 'reps', side: 'alternating', ...record },
              },
              {
                id: 'm2',
                order: 2,
                sets: 3,
                reps: 10,
                exercise: { name: 'Unik', type: 'reps', side: 'both', ...record },
              },
            ],
          },
        },
      ])[0].exercises.map((exercise) => exercise.dose);

    expect(plan({ enrichmentData: { schemaVersion: '3.3' } })).toEqual(['3 × 10 na każdą stronę', '3 × 10']);
    expect(plan({ enrichmentData: {} })).toEqual(['3 × 10', '3 × 10']);
  });
});

// Test asystenta 17.11 (P52): „Ten tydzień: brak planu” przy planie od jutra, „Zestaw” = starszy z dwóch planów.
describe('contextPlanFacts', () => {
  const NOW = new Date(2026, 10, 17, 12, 0);
  const older = { ...knee, id: 'pa-old', assignedAt: '2026-11-17T08:00:00Z', startDate: '2026-11-17T00:00:00' };
  const newer = {
    ...knee,
    id: 'pa-new',
    assignedAt: '2026-11-17T11:00:00Z',
    startDate: '2026-11-18T00:00:00',
    exerciseSet: { ...knee.exerciseSet!, id: 'set-new', name: 'Ból lędźwi po poprawie' },
  };

  it('names the newest current plan as the set', () => {
    expect(contextPlanFacts([older, newer], [], NOW).set).toBe('Ból lędźwi po poprawie');
    expect(contextPlanFacts([{ ...knee, status: 'completed' }], [], NOW).set).toBe('brak aktywnego');
  });

  it('counts this week from every current plan', () => {
    const adherence = [
      { assignmentId: 'pa-old', targetSessions: 3, completedSessions: 1 },
      { assignmentId: 'pa-new', targetSessions: 4, completedSessions: 0 },
    ];
    expect(contextPlanFacts([older, newer], adherence, NOW).week).toBe('1 z 7 treningów');
  });

  it('does not say „brak planu” when a current plan has no sessions counted this week yet', () => {
    expect(contextPlanFacts([newer], [], NOW).week).toBe('plan od 18 listopada');
    expect(
      contextPlanFacts([older], [{ assignmentId: 'pa-old', targetSessions: 0, completedSessions: 0 }], NOW).week
    ).toBe('plan aktywny, brak treningów w tym tygodniu');
    expect(contextPlanFacts([], [], NOW).week).toBe('brak planu');
  });
});
