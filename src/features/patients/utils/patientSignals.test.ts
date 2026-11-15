import { describe, expect, it } from 'vitest';
import type { OrganizationPatientDto, PatientAttention } from '@/types/apollo';
import { selectPatientSignals } from './patientSignals';

const quiet: PatientAttention = { tone: 'success', reasons: [], daysSinceTraining: 0, hasPatientSignal: false };

function patient(id: string, therapistId: string | null, attention: PatientAttention | null): OrganizationPatientDto {
  return {
    patient: { id, fullname: `Pacjent ${id}` } as OrganizationPatientDto['patient'],
    therapist: therapistId ? { id: therapistId } : null,
    assignmentStatus: therapistId ? 'assigned' : 'unassigned',
    lastActivity: '2026-11-15T08:00:00.000Z',
    attention,
  };
}

function signal(reason: string, at: string): PatientAttention {
  return { tone: 'danger', reasons: [reason], maxPainLevel: 5, lastSignalAt: at, daysSinceTraining: 0, hasPatientSignal: true };
}

describe('selectPatientSignals', () => {
  const patients = [
    patient('quiet', 't-1', quiet),
    patient('inactive', 't-1', { tone: 'danger', reasons: ['INACTIVE'], daysSinceTraining: 6, hasPatientSignal: false }),
    patient('pain-old', 't-1', signal('PAIN', '2026-11-14T08:00:00.000Z')),
    patient('note-new', 't-1', signal('NOTE', '2026-11-15T09:00:00.000Z')),
    patient('colleague', 't-2', signal('PAIN', '2026-11-15T10:00:00.000Z')),
    patient('old-api', 't-1', null),
  ];

  it('counts only signals from the patient, freshest first, for the therapist own patients', () => {
    expect(selectPatientSignals(patients, 't-1').map((item) => item.patientId)).toEqual(['note-new', 'pain-old']);
  });

  it('shows the whole organization to someone without own patients', () => {
    expect(selectPatientSignals(patients, 'owner').map((item) => item.patientId)).toEqual([
      'colleague',
      'note-new',
      'pain-old',
    ]);
  });

  it('has nothing to ring about when the API has no attention yet', () => {
    expect(selectPatientSignals([patient('old-api', 't-1', null)], 't-1')).toEqual([]);
  });
});
