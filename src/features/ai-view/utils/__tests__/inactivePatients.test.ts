import { describe, expect, it } from 'vitest';

import { selectInactivePatients } from '../inactivePatients';

const NOW = new Date('2026-10-30T12:00:00Z');
const PATIENTS = [
  { id: 'mine-idle', name: 'Anna', therapistId: 'me', lastActivity: '2026-10-20T12:00:00Z' },
  { id: 'mine-active', name: 'Ola', therapistId: 'me', lastActivity: '2026-10-30T08:00:00Z' },
  { id: 'colleague-idle', name: 'Ewa', therapistId: 'colleague', lastActivity: '2026-10-10T12:00:00Z' },
];

describe('selectInactivePatients', () => {
  it('lists only the signed-in therapist patients who need attention', () => {
    expect(selectInactivePatients(PATIENTS, 'me', NOW)?.map((patient) => patient.id)).toEqual(['mine-idle']);
  });

  it('shows nothing until the therapist is known', () => {
    expect(selectInactivePatients(PATIENTS, undefined, NOW)).toBeNull();
  });
});
