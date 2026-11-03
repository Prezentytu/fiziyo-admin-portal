import { describe, expect, it } from 'vitest';

import { pendingReminderIds, selectInactivePatients } from '../inactivePatients';

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

describe('pendingReminderIds', () => {
  it('reminds everyone on the list, not only the rows shown, skipping those already reminded', () => {
    const attention = Array.from({ length: 8 }, (_, index) => ({ id: `p${index}` }));
    expect(pendingReminderIds(attention, ['p1'])).toEqual(['p0', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
  });

  it('stays within what the API accepts in one call (50)', () => {
    const attention = Array.from({ length: 60 }, (_, index) => ({ id: `p${index}` }));
    expect(pendingReminderIds(attention, [])).toHaveLength(50);
  });
});
