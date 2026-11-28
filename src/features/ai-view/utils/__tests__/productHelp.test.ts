import { describe, expect, it } from 'vitest';
import { productHelpFor } from '../productHelp';

describe('product help routing', () => {
  it.each([
    ['Jak dodać drugą placówkę?', 'clinic'],
    ['Jak dodać drugi gabinet?', 'clinic'],
    ['Gdzie zmienię logo organizacji?', 'company-profile'],
    ['Jak dołączyć do innej organizacji?', 'organizations'],
    ['Jak dodac kolejna lokalizacje?', 'clinic'],
    ['Jak zaprosić fizjoterapeutę do współpracy?', 'collaboration'],
    ['Jak zaprosić kogoś do mojego zespołu?', 'team'],
    ['Czemu nie widzę wszystkich pacjentów?', 'visibility'],
    ['Co nowego w aplikacji pacjenta?', 'patient-news'],
    ['Co nowego w portalu?', 'portal-news'],
    ['Co nowego w aplikacji mobilnej?', 'mobile-news'],
    ['Co nowego w aplikacji fizjoterapeuty?', 'therapist-news'],
    ['Gdzie znajdę instrukcję dla pacjenta?', 'guide'],
    ['Czy macie na blogu materiał o regularności?', 'blog'],
  ])('%s', (text, topic) => expect(productHelpFor(text)?.topic).toBe(topic));

  it.each([
    'Co nowego u pacjenta?',
    'Dodaj pacjenta do gabinetu',
    'Dodaj ćwiczenie do gabinetu',
    'Ułóż zestaw dla pacjenta',
    'Pacjent nie ma planu. Ułóż zestaw na kolano',
    'Czy Anna odebrała zestaw?',
    'Ma własny gabinet',
  ])('keeps the existing conversation for %s', (text) => expect(productHelpFor(text)).toBeUndefined());

  it('uses only the last help question for short replies', () => {
    expect(productHelpFor('Ma własny gabinet', 'collaboration')?.topic).toBe('referral');
    expect(productHelpFor('Do mojego zespołu', 'collaboration')?.topic).toBe('team');
    expect(productHelpFor('Nie wiem', 'missing-plan')?.topic).toBe('connect');
    expect(productHelpFor('Ma własny gabinet', 'missing-plan')).toBeUndefined();
  });

  it('prefills only the reported symptom and keeps a bare request empty', () => {
    expect(productHelpFor('Na Androidzie znika dźwięk. Zgłoś błąd.')?.description).toBe('Na Androidzie znika dźwięk');
    expect(productHelpFor('Zgłoś błąd')?.description).toBeUndefined();
  });

  it('routes explicit feature-request ideas to feature-request topic for 0 credits (SPEC-072)', () => {
    const withIdea = productHelpFor('Chcę zgłosić potrzebę funkcji: automatyczne przypomnienia SMS dla pacjentów.');
    expect(withIdea?.topic).toBe('feature-request');
    expect(withIdea?.description).toContain('automatyczne przypomnienia SMS');
    expect(productHelpFor('Zgłoś sugestię')?.topic).toBe('feature-request');
    expect(productHelpFor('Zgłoś sugestię')?.description).toBeUndefined();
  });
});
