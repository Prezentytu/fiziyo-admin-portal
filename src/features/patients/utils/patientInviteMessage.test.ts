import { describe, expect, it } from 'vitest';

import { patientInviteShareData } from './patientInviteMessage';

const url = 'https://fiziyo.pl/start?patient=p&org=o&therapist=t';

describe('patientInviteShareData', () => {
  it('mówi pacjentowi, od kogo jest link i czym założyć konto, bo konto łączy się po e-mailu albo telefonie z gabinetu', () => {
    const data = patientInviteShareData({ patientName: 'Jan Testowy', organizationName: 'Gabinet Ruch', joinUrl: url });

    expect(data.url).toBe(url);
    expect(data.title).toBe('FiziYo: plan ćwiczeń dla Jan Testowy');
    expect(data.text).toContain('Gabinet Ruch');
    expect(data.text).toContain('e-mail albo numer telefonu podany w gabinecie');
    // Link idzie w `url`; powtórzony w tekście dubluje się w komunikatorach.
    expect(data.text).not.toContain(url);
  });

  it('bez nazwy gabinetu nie wstawia pustego miejsca', () => {
    const data = patientInviteShareData({ patientName: 'Jan', organizationName: '  ', joinUrl: url });

    expect(data.text.startsWith('Twój gabinet fizjoterapii')).toBe(true);
  });
});
