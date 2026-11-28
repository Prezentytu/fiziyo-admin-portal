import { describe, expect, it } from 'vitest';
import { productHelpFor } from '../productHelp';
import { PRODUCT_HELP_EXTERNAL_URLS } from '../../catalog/ProductHelpCard';

describe('product help routing', () => {
  it.each([
    // Dotychczasowe ścieżki + regresje audytu SPEC-071
    ['Jak dodać drugą placówkę?', 'clinic'],
    ['Jak dodać drugi gabinet?', 'clinic'],
    ['Otwieram drugą lokalizację gabinetu — jak ją dodać w FiziYo?', 'clinic'], // S22a
    ['Gdzie zmienię logo organizacji?', 'company-profile'],
    ['Jak dołączyć do innej organizacji?', 'organizations'],
    ['Jak dodac kolejna lokalizacje?', 'clinic'],
    ['Jak zaprosić fizjoterapeutę do współpracy?', 'collaboration'], // S22b
    ['Jak zaprosić kogoś do mojego zespołu?', 'team'],
    ['Czemu nie widzę wszystkich pacjentów?', 'visibility'],
    ['Co nowego w aplikacji pacjenta?', 'patient-news'],
    ['Co nowego w portalu?', 'portal-news'],
    ['Co nowego pojawiło się ostatnio w FiziYo?', 'portal-news'], // S24b
    ['Co nowego w aplikacji mobilnej?', 'mobile-news'],
    ['Co nowego w aplikacji fizjoterapeuty?', 'therapist-news'],
    ['Gdzie znajdę instrukcję dla pacjenta?', 'guide'], // S24a
    ['Czy macie na blogu materiał o regularności?', 'blog'],
    // Nowe tematy ekosystemu (SPEC-071)
    ['Co to jest sprawniejszy.pl?', 'sprawniejszy'], // S38a
    ['Gdzie znajdę darmowy 7-dniowy kurs Zdrowe plecy na blog.fiziyo.pl?', 'blog-course'], // S38b
    ['O czym piszecie na blog.fiziyo.pl?', 'blog-course'],
    ['Co potrafi aplikacja mobilna pacjenta FiziYo?', 'mobile-app-features'], // S38c
    ['Czy w aplikacji pacjenta są punkty zdrowia i odznaki?', 'mobile-app-features'],
    ['Gdzie jest Kosz? Usunąłem zestaw i chcę go przywrócić.', 'trash-recovery'], // S39a
    ['Jak zduplikować szablon zestawu?', 'trash-recovery'],
    ['Do czego służy spinacz w pasku czatu?', 'composer-tools'], // S39b
    ['Jak dodać film z YouTube do ćwiczenia?', 'composer-tools'],
    ['Jak działa dyktowanie poleceń w czacie?', 'composer-tools'],
    ['Ile kredytów AI kosztuje wiadomość i co się stanie jak skończy się pula?', 'ai-credits'], // S31a
    ['Jak przekazać plan pacjentowi bez konta i bez smartfona — kod QR czy PDF?', 'patient-access-qr'], // S21b
    ['Czy mogę zobaczyć podgląd jak u pacjenta?', 'phone-preview'], // S37a
    ['Jak pacjent zobaczy to ćwiczenie na telefonie?', 'phone-preview'],
  ])('%s → %s', (text, topic) => expect(productHelpFor(text)?.topic).toBe(topic));

  it.each([
    'Co nowego u pacjenta?',
    'Dodaj pacjenta do gabinetu',
    'Dodaj ćwiczenie do gabinetu',
    'Ułóż zestaw dla pacjenta',
    'Ułóż zestaw na ból pleców',
    'Pacjent nie ma planu. Ułóż zestaw na kolano',
    'Czy Anna odebrała zestaw?',
    'Ma własny gabinet',
    'Pokaż podgląd jak u pacjenta dla planu Krystyny',
    'Dodaj pacjenta Jan Kowalski z kręgosłupem',
    'Co się zmieniło u Anny od ostatniej wizyty?',
    'Ostatnie zmiany w planie Krystyny',
    'Jaki poziom bólu zgłosiła Anna w aplikacji?',
    'Przypisz Annie zestaw na kolano, nie ma smartfona',
    'Wyślij plan Annie, nie ma aplikacji',
  ])('keeps the existing conversation for %s (no false positive)', (text) =>
    expect(productHelpFor(text)).toBeUndefined()
  );

  it.each([
    'Pacjent nie ma planu. Ułóż zestaw na kolano',
    'Ułóż zestaw dla Anny, nie za trudny',
    'Ułóż zestaw tak jak ostatnio',
  ])('keeps a command after the missing-plan card for %s (no false positive)', (text) =>
    expect(productHelpFor(text, 'missing-plan')).toBeUndefined()
  );

  it('uses only the last help question for short and natural-language follow-up replies (S23)', () => {
    expect(productHelpFor('Ma własny gabinet', 'collaboration')?.topic).toBe('referral');
    expect(productHelpFor('Do mojego zespołu', 'collaboration')?.topic).toBe('team');
    expect(productHelpFor('Nie wiem', 'missing-plan')?.topic).toBe('connect');
    // S23 Turn 2: naturalna odpowiedź tekstowa zamiast klikania chipa
    expect(
      productHelpFor('Sprawdziłam, widzi nazwę mojego gabinetu w aplikacji, ale lista zestawów dalej jest pusta', 'missing-plan')
        ?.topic
    ).toBe('check-assignment');
    expect(productHelpFor('Niestety nie widzi gabinetu w aplikacji', 'missing-plan')?.topic).toBe('connect');
    expect(productHelpFor('Sprawdziłam przypisanie i dalej pusto na telefonie', 'check-assignment')?.topic).toBe('report');
    expect(productHelpFor('Ma własny gabinet', 'missing-plan')).toBeUndefined();
  });

  it('prefills only the reported symptom and keeps a bare request empty', () => {
    expect(productHelpFor('Na Androidzie znika dźwięk. Zgłoś błąd.')?.description).toBe('Na Androidzie znika dźwięk');
    expect(productHelpFor('Zgłoś błąd')?.description).toBeUndefined();
  });

  it('exposes only verified HTTPS external URLs for ecosystem help cards', () => {
    expect(PRODUCT_HELP_EXTERNAL_URLS).toEqual([
      'https://fiziyo.pl/',
      'https://fiziyo.pl/guide',
      'https://sprawniejszy.pl/',
      'https://blog.fiziyo.pl/',
      'https://blog.fiziyo.pl/kurs/zdrowe-plecy-7-dni/',
    ]);
    for (const url of PRODUCT_HELP_EXTERNAL_URLS) {
      expect(() => new URL(url)).not.toThrow();
      expect(url.startsWith('https://')).toBe(true);
    }
  });
});
