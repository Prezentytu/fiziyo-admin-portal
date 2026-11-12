import { describe, expect, it } from 'vitest';

import { summarizePatientPlans, type PlanAssignmentSource } from '../patientPlan';

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
});
