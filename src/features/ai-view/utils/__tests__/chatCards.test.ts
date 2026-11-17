import { describe, expect, it } from 'vitest';

import { conversationPatientId, type ChatCardSpec } from '../chatCards';

const card = (patientId: string): { role: 'assistant'; spec: ChatCardSpec } => ({
  role: 'assistant',
  spec: { component: 'PatientPeek', patientId },
});

describe('conversationPatientId', () => {
  it('is the patient of the latest card when nobody was opened in the context panel', () => {
    expect(conversationPatientId([card('p-jan'), { role: 'user' }, card('p-ewa')], undefined)).toBe('p-ewa');
    expect(conversationPatientId([{ role: 'user' }], undefined)).toBeUndefined();
  });

  it('is the patient opened in the context panel until a later card is about someone else', () => {
    const messages = [card('p-ewa'), { role: 'user' as const }];
    const pin = { patientId: 'p-jan', messageCount: messages.length };
    expect(conversationPatientId(messages, pin)).toBe('p-jan');
    // Test asystenta 17.11 (K1b, P69): pacjent otwarty raz w panelu zostawał pacjentem rozmowy do jej końca.
    expect(conversationPatientId([...messages, card('p-halina')], pin)).toBe('p-halina');
  });
});
