import { z } from 'zod';
import { normalizeSearchText } from '@/features/exercises/utils/exerciseSearch';

/** Only topics and a report draft are stored. Links and access are resolved by the portal. */
export const productHelpSchema = z.object({
  component: z.literal('ProductHelp'),
  topic: z.enum([
    'clinic',
    'company-profile',
    'organizations',
    'visibility',
    'collaboration',
    'team',
    'referral',
    'missing-plan',
    'connect',
    'check-assignment',
    'guide',
    'report',
    'portal-news',
    'patient-news',
    'mobile-news',
    'therapist-news',
    'blog',
    'blog-course',
    'website',
    'sprawniejszy',
    'mobile-app-features',
    'trash-recovery',
    'composer-tools',
    'ai-credits',
    'patient-access-qr',
    'phone-preview',
  ]),
  description: z.string().max(2000).optional(),
});

export type ProductHelpSpec = z.infer<typeof productHelpSchema>;
export type ProductHelpTopic = ProductHelpSpec['topic'];

const REPORT_COMMAND =
  /\b(?:zg[lł]o[śs](?:i[ćc])?|zaraport(?:uj|owa[ćc]))\s+(?:(?:ten|to|taki)\s+)?(?:b[łl][ąa]d|bug(?:a)?|problem|usterk[ęe])/iu;
const PLAN_REPORT =
  'Pacjent nie widzi przypisanego zestawu w aplikacji mobilnej po sprawdzeniu połączenia z gabinetem.';

// Guard przed fałszywym przechwyceniem komend tworzenia/przypisywania zestawu albo dodawania pacjenta.
const CREATE_SET_OR_PATIENT =
  /\b(?:uloz\w*|utworz\w*|stworz\w*|przygotuj\w*|dobierz\w*|przypisz\w*|wyslij\w*|daj)\b.*\b(?:zestaw|plan|cwiczeni)|\bdodaj\s+(?:pacjent|nowego\s+pacjent|nowa\s+pacjent|cwiczeni)/;

// Guard przed przechwyceniem pytań o konkretnego pacjenta lub jego plan przez temat nowości produktu.
const PATIENT_SPECIFIC =
  /\bu\s+(?!was\b|nas\b|ciebie\b|siebie\b)[a-z]{2,}|\bplan(?:ie|u|em)?\b|\bwizyt\w*|\bpacjent(?:a|ki|ow)?\s+[a-z]{3,}/;

function continuedTopic(text: string, previous?: ProductHelpTopic): ProductHelpTopic | undefined {
  if (previous === 'mobile-news') {
    if (/^(?:pacjent|pacjenta|aplikacja pacjenta)$/.test(text)) return 'patient-news';
    if (/^(?:fizjoterapeuta|terapeuta|tryb fizjoterapeuty)$/.test(text)) return 'therapist-news';
  }
  if (previous === 'collaboration') {
    if (/^(?:do (?:mojego |naszego )?zespolu|pracownik\w*|do (?:mojego |naszego )?gabinetu)$/.test(text)) return 'team';
    if (/^(?:ma (?:swoj|wlasny) gabinet|polecenie|polecic fiziyo|inny gabinet)$/.test(text)) return 'referral';
  }
  if (previous === 'missing-plan' && !CREATE_SET_OR_PATIENT.test(text)) {
    // SPEC-071 / S23: akceptujemy naturalne zdania wpisane tekstem, nie tylko kliknięcie chipa.
    // Gołe „tak”/„nie” liczy się tylko na początku odpowiedzi, bo „nie” pada w większości poleceń.
    if (
      !/\bnie\s+(?:widzi|wiem|polacz)/.test(text) &&
      /^tak\b|\b(?:widzi\b.{0,35}\bgabinet\w*|gabinet\w*.{0,20}widzi|polaczon\w*|jest\s+gabinet\w*)\b/.test(text)
    ) {
      return 'check-assignment';
    }
    if (/^nie\b|\b(?:nie\s+widzi|brak\s+gabinetu|pusto\s+na\s+start|nie\s+polacz|nie\s+wiem)\b/.test(text)) {
      return 'connect';
    }
  }
  if ((previous === 'connect' || previous === 'check-assignment') && !CREATE_SET_OR_PATIENT.test(text)) {
    // „Zgłoś problem: <opis>” zostaje dla REPORT_COMMAND, żeby nie nadpisać słów użytkownika stałym opisem.
    if (/\b(?:dalej\s+pusto|dalej\s+nie\s+dziala|nadal\s+(?:nie\s+(?:widzi|dziala)|pusto))\b|\bzglos\s+(?:to|problem)$/.test(text)) {
      return 'report';
    }
  }
}

function helpTopic(text: string): ProductHelpTopic | undefined {
  // 1. Co nowego / release notes (SPEC-071 / S24b: również naturalne parafrazy bez końca linii).
  // Guard na całym bloku: „co się zmieniło u Anny”, „zmiany w planie Anny”, „aplikacji pacjenta Anny” to pytania o pacjenta.
  if (
    /\b(?:co nowego|nowosci|nowego w|jakie nowosci|co sie zmienilo|ostatnie zmiany|release not\w*)\b/.test(text) &&
    !PATIENT_SPECIFIC.test(text)
  ) {
    if (/aplikacj.{0,18}pacjent|apce pacjenta/.test(text)) return 'patient-news';
    if (/mobiln|na telefon|aplikacj|apce/.test(text)) {
      return /fizjoterapeut|terapeut/.test(text) ? 'therapist-news' : 'mobile-news';
    }
    if (
      !/\bu\s+pacjent|\bpacjent\w*\b/.test(text) &&
      (/^(?:co nowego|nowosci)$/.test(text) || /\b(?:portal\w*|panel\w*|fiziyo|release)\b/.test(text))
    ) {
      return 'portal-news';
    }
  }

  // 2. Serwis pacjenta sprawniejszy.pl (SPEC-071 / S38a).
  if (/\bsprawniejszy(?:\.pl)?\b/.test(text)) return 'sprawniejszy';

  // 3. Kurs 7-dniowy „Zdrowe plecy” i szczegółowa oferta blog.fiziyo.pl (SPEC-071 / S38b).
  if (
    !CREATE_SET_OR_PATIENT.test(text) &&
    (/\bkurs\w*\b.{0,24}\bzdrowe\s+plecy\b|\b7[\s-]*dniow\w*\s+kurs|\bblog\.fiziyo(?:\.pl)?\b/.test(text) ||
      (/\bblog(?:u|a|iem)?\b/.test(text) &&
        /\bkurs|zdrowe\s+plecy|adherencj|jakie\s+artykul|lista\s+artykul|o\s+czym\s+piszecie/.test(text)))
  ) {
    return 'blog-course';
  }
  if (
    /\bblog(?:u|a|iem)?\b/.test(text) &&
    /czy macie|co jest|o czym|co znajde|material|artykul|gdzie|otworz|pokaz|link/.test(text)
  )
    return 'blog';

  if (
    /stron\w* (?:internetow\w* )?fiziyo\b|\bfiziyo\.pl\b/.test(text) &&
    /gdzie|pokaz|otworz|link|co jest|o czym|co znajde|czy macie/.test(text)
  )
    return 'website';

  // 4. Podgląd jak u pacjenta (SPEC-070 / S37a — pytania ogólne, bez wskazywania konkretnego planu pacjenta).
  if (
    /podglad\w*\s+(?:jak\s+u\s+pacjenta|na\s+telefon|aplikacji\s+pacjenta|telefonu)|symulator\w*\s+telefon|jak\s+(?:pacjent\s+zobacz|zobacz\w*\s+(?:to\s+)?pacjent|to\s+wyglada\s+na\s+telefon)/.test(
      text
    ) &&
    !/\b(?:dla\s+planu|planu?\s+[a-z]{3,}|dla\s+pacjenta\s+[a-z]{3,})\b/.test(text)
  )
    return 'phone-preview';

  // 5. Możliwości aplikacji mobilnej pacjenta (SPEC-071 / S38c).
  if (
    (/co\s+(?:potrafi|umie|ma|oferuje|widzi)\s+(?:pacjent\s+w\s+)?aplikacj|funkcj\w*\s+aplikacji\s+(?:mobiln|pacjent|fiziyo)|mozliwosci\s+aplikacji/.test(
      text
    ) ||
      (/aplikacj\w*|apce/.test(text) &&
        /\b(?:punkt\w*\s+zdrowia|odznak\w*|grywalizacj|przypomnieni|czat\s+z\s+pacjent|nagryw\w*\s+film|player)\b/.test(
          text
        ))) &&
    !CREATE_SET_OR_PATIENT.test(text)
  )
    return 'mobile-app-features';

  // 6. Kredyty AI i tryb bez kredytów (SPEC-071 / S31a).
  if (
    /\bkredyt\w*\b/.test(text) &&
    /(?:ile|koszt|zasad|dziala|skoncza|wyczerp|brak|zwieksz|limit|pula|czemu|dlaczego|za\s+co|pobier|nalicz|zuzyw)/.test(
      text
    )
  )
    return 'ai-credits';

  // 7. Kosz i duplikowanie szablonu (SPEC-071 / S39a).
  if (
    /\bkosz(?:u|a|em)?\b.{0,30}\b(?:zestaw|cwiczen|przywr|usun|gdzie|jak)\b|\b(?:przywr[oó]c\w*|odzysk\w*)\b.{0,30}\b(?:usuni\w*|zestaw|cwiczen)|\b(?:z?duplikowa\w*|duplikuj\w*|skopiowa\w*\s+szablon|kopi\w*\s+szablon)\b/.test(
      text
    ) ||
    /\bgdzie\s+(?:jest|znajde)\s+kosz\b/.test(text)
  )
    return 'trash-recovery';

  // 8. Narzędzia paska czatu: spinacz dokumentów, mikrofon/dyktowanie, filmy YouTube (SPEC-071 / S39b).
  if (
    (/\bspinacz\w*\b|do\s+czego\s+sluzy\s+(?:spinacz|mikrofon|ikona)|jak\s+(?:wgrac|dodac|zeskanowac)\s+(?:dokument|zalecenia|zdjecie\s+zalecen)|jak\s+dziala\s+dyktowan|dyktowa\w*\s+(?:w\s+czacie|glosow|polecen)|\b(?:film\w*|link\w*)\b.{0,20}\byoutube\b|\byoutube\b.{0,25}\b(?:cwiczen|dodac|wkleic|jak)\b/.test(
      text
    ) &&
      !CREATE_SET_OR_PATIENT.test(text))
  )
    return 'composer-tools';

  // 9. Przekazanie planu pacjentowi bez konta / QR / PDF (SPEC-071 / S21b).
  if (
    (/\b(?:kod\w*\s+qr|bez\s+konta|nie\s+ma\s+(?:konta|smartfon\w*|aplikacji)|bez\s+smartfon\w*)\b/.test(text) &&
      /\b(?:plan|zestaw|przekaz|wysl|udostepn|wydruk|pdf|link|dostep|jak)\b/.test(text) &&
      !CREATE_SET_OR_PATIENT.test(text)) ||
    /\bjak\s+(?:przekazac|udostepnic|wydrukowac)\s+(?:plan|zestaw)\b.{0,30}\b(?:pdf|qr|telefon|papier|kart)/.test(text)
  )
    return 'patient-access-qr';

  if (
    /instrukcj\w* (?:obslugi |do )?(?:dla pacjent|aplikacj)|przewodnik (?:po aplikacji|dla pacjent)/.test(text) &&
    !/wykonania|wydruk|pdf/.test(text)
  )
    return 'guide';
  if (
    /(?:nie widzi|nie widze|brak|nie ma|nie wyswietla)\b.{0,28}\b(?:zestaw|plan)\w*|(?:plan|zestaw)\w*.{0,20}(?:nie widac|nie wyswietla)/.test(
      text
    ) &&
    /telefon|aplikacj|pacjent/.test(text) &&
    !/\b(?:uloz|utworz|przygotuj|przypisz|dodaj)\b.*\b(?:plan|zestaw|pacjent)/.test(text)
  )
    return 'missing-plan';
  if (/profil firmy|(?:nazw[ae]|logo|opis|ustawienia) (?:mojej |naszej )?(?:organizacji|firmy)/.test(text))
    return 'company-profile';
  if (/moje organizacje|do (?:jakich|ktorych) organizacji naleze|dolacz\w* do (?:innej |nowej )?organizacji/.test(text))
    return 'organizations';
  if (/widocznosc pacjent|(?:nie widze|widziec) wszystkich pacjent/.test(text)) return 'visibility';

  // 10. Dodawanie placówki / lokalizacji (SPEC-071 / S22a: 1. osoba, zaimki, kolokacje „druga lokalizacja”).
  if (
    (/(?:dodac|dodaj|utworz\w*|zaloz\w*|otworz\w*|otwieram|chce\s+dodac)\s+(?:(?:drug\w*|kolejn\w*|now\w*|nastepn\w*|pierwsz\w*|dodatkow\w*)\s+)?(?:placowk|gabinet|lokalizacj)\w*\b/.test(
      text
    ) ||
      /\b(?:drug\w*|kolejn\w*|now\w*|dodatkow\w*)\s+(?:placowk|lokalizacj|gabinet)\w*\b.{0,35}\b(?:dodac|utworz|zaloz|gdzie|jak)\b/.test(
        text
      )) &&
    !CREATE_SET_OR_PATIENT.test(text)
  )
    return 'clinic';
  if (/poleci\w* fiziyo|link polecajac\w* (?:dla )?fizjo/.test(text)) return 'referral';
  if (/zapros\w*|dolacz\w*/.test(text) && /do (?:\w+ ){0,2}zespolu|pracownik/.test(text)) return 'team';
  if (/zapros\w*|wspolprac\w*/.test(text) && /fizjoterapeut|\bfizjo\b|wspolpracownik/.test(text))
    return 'collaboration';
}

export function productHelpFor(message: string, previous?: ProductHelpTopic): ProductHelpSpec | undefined {
  const normalized = normalizeSearchText(message)
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
  const followUp = continuedTopic(normalized, previous);
  if (!followUp && REPORT_COMMAND.test(message)) {
    const symptom = message
      .replace(REPORT_COMMAND, '')
      .replace(/^[\s.!?,:–-]+|[\s.!?,:–-]+$/g, '')
      .trim();
    return {
      component: 'ProductHelp',
      topic: 'report',
      description: symptom.length >= 10 ? symptom.slice(0, 2000) : undefined,
    };
  }
  const topic = followUp ?? helpTopic(normalized);
  if (!topic) return undefined;
  return {
    component: 'ProductHelp',
    topic,
    ...(topic === 'report'
      ? { description: previous === 'connect' ? 'Pacjent nie może połączyć aplikacji z gabinetem.' : PLAN_REPORT }
      : {}),
  };
}
