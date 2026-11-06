import { describe, expect, it } from 'vitest';
import { patientCardFileName, toPdfOrganization } from '../patientCardPdf';

describe('patientCardFileName', () => {
  it('zostawia polskie litery, usuwa znaki specjalne i bierze imię pacjenta', () => {
    expect(patientCardFileName('Kolano: łąkotka / tydzień 1', 'Żaneta Kowalska')).toBe(
      'Karta_Pacjenta_Kolano_łąkotka_tydzień_1_Żaneta.pdf'
    );
  });

  it('przycina nazwę planu do 50 znaków', () => {
    const fileName = patientCardFileName('a'.repeat(80), 'Jan');
    expect(fileName).toBe(`Karta_Pacjenta_${'a'.repeat(50)}_Jan.pdf`);
  });
});

describe('toPdfOrganization', () => {
  it('mapuje pola kontaktu i daje nazwę zastępczą', () => {
    expect(toPdfOrganization({ name: '', contactPhone: '123', contactEmail: 'g@x.pl' })).toEqual({
      name: 'Gabinet Fizjoterapii',
      logoUrl: undefined,
      address: undefined,
      phone: '123',
      email: 'g@x.pl',
      website: undefined,
    });
  });
});
