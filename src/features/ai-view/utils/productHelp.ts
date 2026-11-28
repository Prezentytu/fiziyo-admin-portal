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
    'website',
    'capabilities-overview',
  ]),
  description: z.string().max(2000).optional(),
});

export type ProductHelpSpec = z.infer<typeof productHelpSchema>;
export type ProductHelpTopic = ProductHelpSpec['topic'];

const REPORT_COMMAND =
  /\b(?:zg[lł]o[śs](?:i[ćc])?|zaraport(?:uj|owa[ćc]))\s+(?:(?:ten|to|taki)\s+)?(?:b[łl][ąa]d|bug(?:a)?|problem|usterk[ęe])/iu;
const PLAN_REPORT =
  'Pacjent nie widzi przypisanego zestawu w aplikacji mobilnej po sprawdzeniu połączenia z gabinetem.';

function continuedTopic(text: string, previous?: ProductHelpTopic): ProductHelpTopic | undefined {
  if (previous === 'mobile-news') {
    if (/^(?:pacjent|pacjenta|aplikacja pacjenta)$/.test(text)) return 'patient-news';
    if (/^(?:fizjoterapeuta|terapeuta|tryb fizjoterapeuty)$/.test(text)) return 'therapist-news';
  }
  if (previous === 'collaboration') {
    if (/^(?:do (?:mojego |naszego )?zespolu|pracownik\w*|do (?:mojego |naszego )?gabinetu)$/.test(text)) return 'team';
    if (/^(?:ma (?:swoj|wlasny) gabinet|polecenie|polecic fiziyo|inny gabinet)$/.test(text)) return 'referral';
  }
  if (previous === 'missing-plan') {
    if (/^(?:tak|widzi|gabinet widzi|widzi gabinet)$/.test(text)) return 'check-assignment';
    if (/^(?:nie|nie widzi(?: gabinetu)?|nie wiem|brak gabinetu)$/.test(text)) return 'connect';
  }
  if (previous === 'connect' || previous === 'check-assignment') {
    if (/^(?:dalej pusto|dalej nie dziala|nadal nie (?:widzi|dziala)|zglos (?:to|problem))$/.test(text))
      return 'report';
  }
}

function helpTopic(text: string): ProductHelpTopic | undefined {
  // SPEC-073 / S01: pytania o możliwości asystenta i pierwszy kontakt — karta przeglądu za 0 kredytów.
  if (
    /\b(?:co\s+(?:potrafisz|umiesz|dokladnie\s+mozesz|mozesz\s+(?:mi\s+)?(?:tu\s+)?(?:pomoc\s+)?zrobic)|w\s+czym\s+(?:mi\s+)?(?:mozesz\s+)?pomoc|od\s+czego\s+zaczac|jak\s+(?:uzywac|korzystac\s+z|dziala)\s+(?:asystent|fizjoasystent|czat))\b/.test(
      text
    ) &&
    !/\b(?:uloz|utworz|dobierz|dodaj\s+pacjent|przypisz)\b/.test(text)
  )
    return 'capabilities-overview';
  if (/\b(?:co nowego|nowosci|nowego w|release not\w*)\b/.test(text)) {
    if (/aplikacj.{0,18}pacjent|apce pacjenta/.test(text)) return 'patient-news';
    if (/mobiln|na telefon|aplikacj|apce/.test(text)) {
      return /fizjoterapeut|terapeut/.test(text) ? 'therapist-news' : 'mobile-news';
    }
    if (/^(?:co nowego|nowosci)(?:$| (?:w |na )?(?:portalu|panelu|fiziyo)\b)/.test(text)) return 'portal-news';
  }
  if (
    /\bblog(?:u|a|iem)?\b/.test(text) &&
    /czy macie|co jest|o czym|co znajde|material|artykul|gdzie|otworz|pokaz|link/.test(text)
  )
    return 'blog';
  if (
    /stron\w* (?:internetow\w* )?fiziyo\b/.test(text) &&
    /gdzie|pokaz|otworz|link|co jest|o czym|co znajde/.test(text)
  )
    return 'website';
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
  if (
    /(?:dodac|dodaj|utworz\w*|zaloz\w*|otworz\w*) (?:(?:drug\w*|kolejn\w*|now\w*|nastepn\w*|pierwsz\w*|dodatkow\w*) )?(?:placowk|gabinet|lokalizacj)\w*\b/.test(
      text
    )
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
