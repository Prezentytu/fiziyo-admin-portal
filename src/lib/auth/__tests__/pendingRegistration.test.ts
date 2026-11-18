import { describe, expect, it } from 'vitest';

import { readPendingRegistration } from '../pendingRegistration';

describe('readPendingRegistration', () => {
  it('zwraca e-mail i dane z niedokończonej rejestracji, bez hasła', () => {
    expect(
      readPendingRegistration({
        status: 'missing_requirements',
        emailAddress: 'gabinet@poczta.pl',
        unsafeMetadata: {
          firstName: 'Jan',
          lastName: 'Nowak',
          phone: '+48600100200',
          companyName: 'Gabinet Ruch',
          isCompanyAccount: true,
        },
      })
    ).toEqual({
      email: 'gabinet@poczta.pl',
      firstName: 'Jan',
      lastName: 'Nowak',
      phone: '+48600100200',
      companyName: 'Gabinet Ruch',
    });
  });

  it('pomija pola, które nie są tekstem', () => {
    expect(
      readPendingRegistration({
        status: 'missing_requirements',
        emailAddress: 'a@b.pl',
        unsafeMetadata: { phone: 600 },
      })
    ).toMatchObject({ email: 'a@b.pl', phone: '', firstName: '' });
  });

  it('bez trwającej rejestracji zwraca null', () => {
    expect(readPendingRegistration(undefined)).toBeNull();
    expect(readPendingRegistration({ status: null, emailAddress: null })).toBeNull();
    expect(readPendingRegistration({ status: 'complete', emailAddress: 'a@b.pl' })).toBeNull();
  });
});
