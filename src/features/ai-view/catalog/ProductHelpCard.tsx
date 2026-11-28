'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';

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
interface Guide {
  title: string;
  text: string;
  link?: { href: string; label: string };
  choices?: readonly string[];
}

const teamLink = { href: '/organization', label: 'Otwórz Zespół' };
const patientGuide = { href: 'https://fiziyo.pl/guide', label: 'Otwórz instrukcję dla pacjenta' };
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
    text: 'Na blogu znajdziesz artykuły o ćwiczeniu w domu i regularności. Możesz przekazać pacjentowi link do wybranego materiału.',
    link: { href: 'https://blog.fiziyo.pl/', label: 'Otwórz blog FiziYo' },
  },
  website: {
    title: 'Strona FiziYo',
    text: 'Na stronie znajdziesz opis aplikacji, odpowiedzi na pytania gabinetów i formularz kontaktowy.',
    link: { href: 'https://fiziyo.pl/', label: 'Otwórz stronę FiziYo' },
  },
} satisfies Record<Exclude<ProductHelpTopic, 'report' | 'feature-request' | 'portal-news' | 'referral'>, Guide>;

function GuideCard({ guide, spec, testId, messageId, chosen }: HelpProps & { guide: Guide }) {
  const { markChosen, appendExchange } = useChatActions();
  const busy = useChatBusy();
  return (
    <ChatCard title={guide.title} testId={testId}>
      <p>{guide.text}</p>
      {guide.link && (
        <Button asChild variant="outline" data-testid={`${testId}-link`}>
          <Link
            href={guide.link.href}
            target={guide.link.href.startsWith('https:') ? '_blank' : undefined}
            rel={guide.link.href.startsWith('https:') ? 'noopener noreferrer' : undefined}
          >
            {guide.link.label}
          </Link>
        </Button>
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
