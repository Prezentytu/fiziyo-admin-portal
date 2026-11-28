'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { FeedbackDialog } from '@/components/shared/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { REFERRALS_FEATURE_FLAG, REFERRALS_SETTINGS_HREF } from '@/features/referrals/utils/referrals';
import {
  formatReleaseNoteDate,
  releaseNoteHref,
  RELEASE_NOTES_TAKE,
  WHATS_NEW_TAB,
} from '@/features/whats-new/utils/releaseNotes';
import { GET_RELEASE_NOTES_QUERY } from '@/graphql/queries/releaseNotes.queries';
import type { GetReleaseNotesResponse } from '@/graphql/types';
import { useMeFeature } from '@/hooks/useMeFeature';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { isFeedbackEnabled } from '@/lib/featureFlags';
import { SUPPORT_EMAIL } from '@/lib/support';
import { useChatActions, useChatBusy } from '../ChatSessionContext';
import { productHelpFor, type ProductHelpTopic } from '../utils/productHelp';
import { ChatCard } from './ChatCard';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';

type HelpProps = CardProps<'ProductHelp'>;
interface GuideLink {
  href: string;
  label: string;
}
interface Guide {
  title: string;
  text: string;
  link?: GuideLink;
  secondaryLink?: GuideLink;
  copyUrl?: { url: string; label: string };
  choices?: readonly string[];
}

const teamLink = { href: '/organization', label: 'Otwórz Zespół' };
const patientGuide = { href: 'https://fiziyo.pl/guide', label: 'Otwórz instrukcję dla pacjenta' };
const sprawniejszyLink = { href: 'https://sprawniejszy.pl/', label: 'Otwórz sprawniejszy.pl' };
const blogLink = { href: 'https://blog.fiziyo.pl/', label: 'Otwórz blog FiziYo' };
const courseLink = { href: 'https://blog.fiziyo.pl/kurs/zdrowe-plecy-7-dni/', label: 'Otwórz kurs Zdrowe plecy' };

export const PRODUCT_HELP_EXTERNAL_URLS = [
  'https://fiziyo.pl/',
  'https://fiziyo.pl/guide',
  'https://sprawniejszy.pl/',
  'https://blog.fiziyo.pl/',
  'https://blog.fiziyo.pl/kurs/zdrowe-plecy-7-dni/',
] as const;

const guides = {
  'company-profile': {
    title: 'Profil firmy',
    text: 'Otwórz Ustawienia → Profil firmy. W tym miejscu zmienisz nazwę, opis i logo aktywnej organizacji.',
    link: { href: '/settings?tab=organization', label: 'Otwórz Profil firmy' },
  },
  organizations: {
    title: 'Twoje organizacje',
    text: 'W Ustawienia → Organizacje znajdziesz listę swoich organizacji i opcję „Dołącz do organizacji”.',
    link: { href: '/settings?tab=organizations', label: 'Otwórz Organizacje' },
  },
  clinic: {
    title: 'Dodanie placówki',
    text: 'Menu konta → Organizacja → Placówki → Dodaj placówkę. Podaj nazwę i adres placówki, a następnie wybierz „Utwórz placówkę”.',
    link: { href: '/organization?tab=clinics', label: 'Otwórz Placówki' },
  },
  team: {
    title: 'Zaproszenie do zespołu',
    text: 'Otwórz Zespół → Pracownicy → Zaproś do zespołu. Wybierz rolę i wyślij zaproszenie e-mailem lub wygeneruj link.',
    link: teamLink,
  },
  visibility: {
    title: 'Widoczność pacjentów',
    text: 'W Ustawienia → Profil firmy sprawdzisz przełącznik „Fizjoterapeuci widzą wszystkich pacjentów gabinetu”. Zmiana obejmuje personel aktywnej organizacji.',
    link: { href: '/settings?tab=organization', label: 'Otwórz Profil firmy' },
  },
  collaboration: {
    title: 'Kogo chcesz zaprosić?',
    text: 'Czy ta osoba ma pracować z Tobą w jednej organizacji, czy chcesz polecić FiziYo osobie z własnym gabinetem?',
    choices: ['Do mojego zespołu', 'Ma własny gabinet'],
  },
  'missing-plan': {
    title: 'Brak zestawu w aplikacji pacjenta',
    text: 'Czy pacjent po zalogowaniu widzi swój gabinet w aplikacji?',
    choices: ['Gabinet widzi', 'Nie widzi gabinetu', 'Nie wiem'],
  },
  connect: {
    title: 'Połączenie z gabinetem',
    text: 'Poproś pacjenta o zalogowanie się na konto połączone z gabinetem. Jeśli po zeskanowaniu QR widzi „Ten link nie działa”, udostępnij mu nowy kod z karty pacjenta.',
    link: patientGuide,
    choices: ['Dalej nie działa'],
  },
  'check-assignment': {
    title: 'Sprawdzenie przypisania',
    text: 'Na karcie pacjenta sprawdź, czy właściwy zestaw został mu przypisany i od kiedy obowiązuje. Poproś pacjenta o sprawdzenie listy zestawów, również gdy na dziś nie ma treningu.',
    link: { href: '/patients', label: 'Otwórz Pacjentów' },
    choices: ['Dalej pusto'],
  },
  guide: {
    title: 'Instrukcja aplikacji pacjenta',
    text: 'Przewodnik pokazuje, jak połączyć konto z gabinetem, otworzyć zestaw i sprawdzić historię ćwiczeń.',
    link: patientGuide,
  },
  'mobile-news': {
    title: 'Którego widoku telefonu dotyczy pytanie?',
    text: 'Pacjent i fizjoterapeuta mają w aplikacji inne ekrany.',
    choices: ['Aplikacja pacjenta', 'Tryb fizjoterapeuty'],
  },
  'therapist-news': {
    title: 'Wersja aplikacji fizjoterapeuty',
    text: 'W trybie fizjoterapeuty otwórz Więcej → Zarządzanie kontem, aby sprawdzić wersję aplikacji. Czat nie ma osobnej listy wydań dla tego trybu.',
  },
  'patient-news': {
    title: 'Nowości w aplikacji pacjenta',
    text: 'Poproś pacjenta, aby na swoim telefonie otworzył Profil → Co nowego. Tam zobaczy wydania dla aplikacji pacjenta i informację, jeśli funkcja wymaga aktualizacji.',
  },
  blog: {
    title: 'Blog FiziYo',
    text: 'Na blogu znajdziesz 6 artykułów w wersji dla pacjenta i dla fizjoterapeuty (adherencja i regularność, postępy w ćwiczeniach, ból kolana na schodach, sztywny kark, plecy przy biurku, rozgrzewka przed bieganiem) oraz bezpłatny 7-dniowy kurs „Zdrowe plecy”.',
    link: blogLink,
    secondaryLink: courseLink,
    copyUrl: { url: blogLink.href, label: 'Kopiuj link do bloga' },
  },
  'blog-course': {
    title: 'Kurs „Zdrowe plecy” (7 dni) i blog FiziYo',
    text: 'Na blog.fiziyo.pl jest bezpłatny 7-dniowy kurs „Zdrowe plecy” z interaktywnym playerem w przeglądarce oraz 6 dwuperspektywowych artykułów (wersja dla pacjenta i /dla-fizjoterapeuty/): adherencja i regularność, postępy w ćwiczeniach, ból kolana na schodach, sztywny kark, plecy przy biurku i rozgrzewka przed bieganiem.',
    link: courseLink,
    secondaryLink: blogLink,
    copyUrl: { url: courseLink.href, label: 'Kopiuj link do kursu' },
  },
  website: {
    title: 'Strona FiziYo',
    text: 'Na stronie znajdziesz opis aplikacji, odpowiedzi na pytania gabinetów i formularz kontaktowy.',
    link: { href: 'https://fiziyo.pl/', label: 'Otwórz stronę FiziYo' },
  },
  sprawniejszy: {
    title: 'Serwis sprawniejszy.pl (dla pacjenta)',
    text: 'sprawniejszy.pl to strona FiziYo skierowana bezpośrednio do pacjenta — pokazuje, jak wygląda aplikacja mobilna, jak ją pobrać i jak połączyć konto z gabinetem, aby regularnie ćwiczyć w domu.',
    link: sprawniejszyLink,
    copyUrl: { url: sprawniejszyLink.href, label: 'Kopiuj link dla pacjenta' },
  },
  'mobile-app-features': {
    title: 'Możliwości aplikacji mobilnej FiziYo',
    text: 'Aplikacja pacjenta oferuje: 1) interaktywny player ćwiczeń (fazy ruchu z odliczaniem, wskazówki, grafiki/filmy i dźwięki), 2) zapisywanie wykonania, poziomu bólu, trudności i komentarza dla fizjoterapeuty, 3) przypomnienia o treningu, 4) motywację: punkty zdrowia, poziomy i odznaki, 5) historię ćwiczeń oraz osobny tryb fizjoterapeuty. Aplikacja nie ma obecnie bezpośredniego czatu pacjent–terapeuta ani dodawania własnych filmów przez pacjenta.',
    link: patientGuide,
    secondaryLink: sprawniejszyLink,
  },
  'trash-recovery': {
    title: 'Kosz i duplikowanie zestawów',
    text: 'Usunięte zestawy i ćwiczenia przywrócisz w zakładce Kosz (w menu głównym portalu). Aby zduplikować szablon zestawu, otwórz Zestawy, kliknij menu akcji na karcie zestawu i wybierz „Duplikuj”.',
    link: { href: '/kosz', label: 'Otwórz Kosz' },
    secondaryLink: { href: '/exercise-sets', label: 'Otwórz Zestawy' },
  },
  'composer-tools': {
    title: 'Narzędzia paska czatu i filmy YouTube',
    text: 'Spinacz („Dodaj dokument z zaleceniami”) wczytuje plik lub zdjęcie zaleceń i wyciąga ćwiczenia do szkicu. Mikrofon („Dyktuj”) zamienia mowę po polsku na tekst polecenia. Link z YouTube wkleisz na karcie tworzenia lub edycji ćwiczenia w polu „Film (opcjonalnie)” — z szybkim skrótem „Szukaj na YouTube”.',
    link: { href: '/exercises', label: 'Otwórz Ćwiczenia' },
  },
  'ai-credits': {
    title: 'Zasady kredytów AI',
    text: 'Standardowa wiadomość z AI kosztuje 1 kredyt. Pomoc produktowa, skróty, edycja ręczna parametrów, podgląd telefonu i harmonogram kosztują 0 kredytów. Wygenerowanie opisu nowego ćwiczenia kosztuje 4 kredyty, a grafiki AI — 5 kredytów. Po wyczerpaniu puli czat przechodzi na bezpłatny tryb reguł, a limit można zwiększyć w panelu kredytów.',
    link: { href: '/settings', label: 'Otwórz Ustawienia' },
  },
  'patient-access-qr': {
    title: 'Przekazanie planu pacjentowi (QR, link lub PDF)',
    text: 'Na karcie pacjenta otwórz okno „Dostęp”: 1) na telefon — pokaż Kod QR albo wyślij link do aplikacji (po założeniu konta pacjent automatycznie połączy się z gabinetem i zobaczy plan); 2) bez smartfona — wybierz „Drukuj Kartę” lub „Pobierz PDF”.',
    link: { href: '/patients', label: 'Otwórz Pacjentów' },
  },
  'phone-preview': {
    title: 'Podgląd jak u pacjenta (symulator telefonu)',
    text: 'Każde ćwiczenie na karcie zestawu, w wynikach wyszukiwania i na karcie pacjenta ma przycisk z ikoną telefonu „Jak u pacjenta” (oraz „Podgląd na telefonie” dla całego zestawu). Otwiera żywy symulator ekranu aplikacji pacjenta z fazami ruchu, odliczaniem, wskazówkami i grafiką — za 0 kredytów AI.',
  },
} satisfies Record<Exclude<ProductHelpTopic, 'report' | 'feature-request' | 'portal-news' | 'referral'>, Guide>;

function LinkButton({ link, testId }: { readonly link: GuideLink; readonly testId: string }) {
  const external = link.href.startsWith('https:');
  return (
    <Button asChild variant="outline" size="sm" data-testid={testId}>
      <Link href={link.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {link.label}
      </Link>
    </Button>
  );
}

function GuideCard({ guide, spec, testId, messageId, chosen }: HelpProps & { guide: Guide }) {
  const { markChosen, appendExchange } = useChatActions();
  const busy = useChatBusy();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!guide.copyUrl) return;
    try {
      await navigator.clipboard.writeText(guide.copyUrl.url);
      setCopied(true);
      toast.success('Skopiowano link do schowka');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  return (
    <ChatCard title={guide.title} testId={testId}>
      <p>{guide.text}</p>
      {(guide.link || guide.secondaryLink || guide.copyUrl) && (
        <div className="flex flex-wrap gap-2">
          {guide.link && <LinkButton link={guide.link} testId={`${testId}-link`} />}
          {guide.secondaryLink && <LinkButton link={guide.secondaryLink} testId={`${testId}-secondary-link`} />}
          {guide.copyUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleCopy()}
              data-testid={`${testId}-copy-link-btn`}
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? 'Skopiowano' : guide.copyUrl.label}
            </Button>
          )}
        </div>
      )}
      {guide.choices && (
        <QuickReplies
          options={guide.choices}
          chosen={chosen}
          disabled={busy}
          testId={testId}
          onPick={(label) => {
            const next = productHelpFor(label, spec.topic);
            if (next) {
              markChosen(messageId, label);
              appendExchange(label, { spec: next });
            }
          }}
        />
      )}
    </ChatCard>
  );
}

function OrganizationGuide(props: HelpProps & { guide: Guide }) {
  const { canManageOrganization, isLoading } = useRoleAccess();
  if (isLoading)
    return (
      <ChatCard title={props.guide.title} testId={props.testId}>
        Sprawdzam dostęp do ustawień organizacji…
      </ChatCard>
    );
  if (canManageOrganization) return <GuideCard {...props} />;
  return (
    <ChatCard title={props.guide.title} testId={props.testId}>
      {props.spec.topic === 'visibility'
        ? 'Widoczność zależy od ustawień gabinetu i przypisania pacjenta do opieki. Poproś właściciela lub administratora o sprawdzenie dostępu.'
        : 'Tę czynność może wykonać właściciel lub administrator aktywnej organizacji. Poproś go o pomoc.'}
    </ChatCard>
  );
}

function ReferralGuide(props: HelpProps) {
  const enabled = useMeFeature(REFERRALS_FEATURE_FLAG);
  const guide: Guide = enabled
    ? {
        title: 'Polecenie FiziYo',
        text: 'W Ustawienia → Polecenia skopiuj swój link dla fizjoterapeuty, który prowadzi własny gabinet.',
        link: { href: REFERRALS_SETTINGS_HREF, label: 'Otwórz Polecenia' },
      }
    : { title: 'Polecenie FiziYo', text: 'Zakładka Polecenia nie jest obecnie dostępna na tym koncie.' };
  return <GuideCard {...props} guide={guide} />;
}

function PortalNews({ testId }: HelpProps) {
  const { data, loading, error } = useQuery<GetReleaseNotesResponse>(GET_RELEASE_NOTES_QUERY, {
    variables: { take: RELEASE_NOTES_TAKE },
    fetchPolicy: 'no-cache',
  });
  const latest = data?.releaseNotes[0];
  let summary = 'Brak opublikowanych nowości dla tego konta.';
  if (loading) summary = 'Wczytuję najnowsze wydanie portalu…';
  else if (error) summary = 'Nie udało się wczytać nowości. Możesz sprawdzić je w ustawieniach.';
  else if (latest)
    summary = [formatReleaseNoteDate(latest.publishedAt), latest.lead, latest.items[0]?.title ?? latest.fixes[0]]
      .filter(Boolean)
      .join(' · ');
  return (
    <ChatCard title={latest?.title ?? 'Co nowego w portalu'} testId={testId}>
      <p>{summary}</p>
      <Button asChild variant="outline" data-testid={`${testId}-link`}>
        <Link href={latest ? releaseNoteHref(latest.id) : `/settings?tab=${WHATS_NEW_TAB}`}>Otwórz Co nowego</Link>
      </Button>
    </ChatCard>
  );
}

function ReportCard({ spec, chosen, testId, messageId }: HelpProps) {
  const [open, setOpen] = useState(false);
  const { markChosen } = useChatActions();
  const isSuggestion = spec.topic === 'feature-request';
  return (
    <ChatCard title={isSuggestion ? 'Zgłoszenie potrzeby funkcji' : 'Zgłoszenie błędu'} testId={testId}>
      {chosen === 'sent' ? (
        <p>{isSuggestion ? 'Potrzeba funkcji została wysłana do zespołu FiziYo.' : 'Zgłoszenie zostało wysłane do zespołu FiziYo.'}</p>
      ) : isFeedbackEnabled() ? (
        <>
          <p>
            {isSuggestion
              ? 'Opisz krótko, jakiej funkcji potrzebujesz w swoim gabinecie. Pomiń dane pacjenta.'
              : 'Sprawdź opis i dopisz, na jakim urządzeniu występuje problem. Pomiń dane pacjenta.'}
          </p>
          <Button data-testid={`${testId}-report-btn`} onClick={() => setOpen(true)}>
            {isSuggestion ? 'Zgłoś potrzebę funkcji' : 'Otwórz zgłoszenie'}
          </Button>
          {open && (
            <FeedbackDialog
              isOpen
              onClose={() => setOpen(false)}
              onSent={() => markChosen(messageId, 'sent')}
              initialType={isSuggestion ? 'suggestion' : 'bug'}
              initialDescription={spec.description}
              capabilityCode={isSuggestion ? 'other_feature' : undefined}
              screenName={isSuggestion ? 'Czat w portalu (potrzeba funkcji)' : 'Czat w portalu'}
            />
          )}
        </>
      ) : (
        <p>Skontaktuj się z zespołem FiziYo pod adresem {SUPPORT_EMAIL}.</p>
      )}
    </ChatCard>
  );
}

export function ProductHelpCard(props: HelpProps) {
  switch (props.spec.topic) {
    case 'report':
    case 'feature-request':
      return <ReportCard {...props} />;
    case 'portal-news':
      return <PortalNews {...props} />;
    case 'referral':
      return <ReferralGuide {...props} />;
    case 'team':
    case 'clinic':
    case 'company-profile':
    case 'visibility':
      return <OrganizationGuide {...props} guide={guides[props.spec.topic]} />;
    default: {
      const guide = guides[props.spec.topic];
      return guide ? <GuideCard {...props} guide={guide} /> : null;
    }
  }
}
