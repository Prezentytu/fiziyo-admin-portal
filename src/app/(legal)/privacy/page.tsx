import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { LegalSection } from '../_components/LegalSection';
import { PrintButton } from '../_components/PrintButton';
import { TableOfContents, type TocItem } from '../_components/TableOfContents';

export const metadata: Metadata = {
  title: 'Polityka prywatności • FiziYo',
  description:
    'Zasady przetwarzania danych osobowych i ochrony prywatności w platformie FiziYo zgodnie z RODO.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '16 kwietnia 2026';
const EFFECTIVE_FROM = '1 maja 2026';
const DOCUMENT_VERSION = '2.0';

const sections: Array<TocItem & { render: () => React.ReactNode }> = [
  {
    id: 'wprowadzenie',
    label: 'Wprowadzenie',
    render: () => (
      <>
        <p>
          Niniejsza Polityka prywatności opisuje, w jaki sposób platforma FiziYo przetwarza dane osobowe
          Użytkowników (fizjoterapeutów i pracowników gabinetów) oraz Pacjentów. Dokument został opracowany
          zgodnie z rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r.
          (<strong className="font-semibold text-foreground">RODO</strong>).
        </p>
        <p>
          Dbamy o transparentność — poniżej znajdziesz klarowne informacje o celach i podstawach
          przetwarzania, okresach retencji, odbiorcach danych oraz Twoich prawach. Jeżeli masz pytania,
          skontaktuj się z nami pod adresem{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="mailto:iod@fiziyo.pl">
            iod@fiziyo.pl
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'role',
    label: 'Role: administrator i podmiot przetwarzający',
    render: () => (
      <>
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dane konta Użytkownika (fizjoterapeuty)
          </p>
          <p>
            W odniesieniu do danych kont Użytkowników, danych rozliczeniowych i danych technicznych
            <strong className="font-semibold text-foreground"> administratorem</strong> jest Usługodawca — FiziYo sp. z o.o.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dane Pacjentów
          </p>
          <p>
            W odniesieniu do danych Pacjentów wprowadzanych do Platformy przez Użytkownika, Usługodawca
            działa jako <strong className="font-semibold text-foreground">podmiot przetwarzający</strong>{' '}
            (procesor), a administratorem pozostaje Użytkownik (gabinet / terapeuta). Szczegóły regulowane
            są odrębną <em>umową powierzenia przetwarzania</em> (DPA), dostępną w panelu Organizacji.
          </p>
        </div>
      </>
    ),
  },
  {
    id: 'administrator',
    label: 'Administrator danych i kontakt',
    render: () => (
      <>
        <ul className="space-y-1.5">
          <li>
            <span className="text-muted-foreground">Firma: </span>
            <strong className="font-semibold text-foreground">FiziYo sp. z o.o.</strong>
          </li>
          <li>
            <span className="text-muted-foreground">Adres e-mail administratora: </span>
            <a className="text-primary underline-offset-2 hover:underline" href="mailto:support@fiziyo.pl">
              support@fiziyo.pl
            </a>
          </li>
          <li>
            <span className="text-muted-foreground">Inspektor Ochrony Danych (IOD): </span>
            <a className="text-primary underline-offset-2 hover:underline" href="mailto:iod@fiziyo.pl">
              iod@fiziyo.pl
            </a>
          </li>
          <li>
            <span className="text-muted-foreground">Incydenty bezpieczeństwa: </span>
            <a className="text-primary underline-offset-2 hover:underline" href="mailto:security@fiziyo.pl">
              security@fiziyo.pl
            </a>
          </li>
        </ul>
        <p>
          Korespondencję w formie pisemnej należy kierować na adres siedziby Usługodawcy wskazany
          w Regulaminie.
        </p>
      </>
    ),
  },
  {
    id: 'zakres-danych',
    label: 'Zakres przetwarzanych danych',
    render: () => (
      <>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kategoria
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Przykłady danych
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane identyfikacyjne</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  imię, nazwisko, numer PWZFz, nazwa gabinetu, NIP
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane kontaktowe</td>
                <td className="px-4 py-3 align-top text-muted-foreground">adres e-mail, numer telefonu</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane uwierzytelniające</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  identyfikator Clerk, hashowane hasła, tokeny JWT, kody OTP
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane rozliczeniowe</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  plan subskrypcji, historia płatności, dane do faktur (obsługa Stripe)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane Pacjentów</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  imię, nazwisko, rok urodzenia, notatki terapeutyczne, plany ćwiczeń, postępy
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">
                  Szczególne kategorie danych (art. 9 RODO)
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  dane o zdrowiu — przetwarzane wyłącznie przez podmiot wykonujący działalność leczniczą
                  lub osobę zobowiązaną do tajemnicy zawodowej
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane techniczne</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  adres IP, informacje o przeglądarce i urządzeniu, logi systemowe, identyfikatory sesji
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top font-medium text-foreground">Dane z plików cookies</td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  identyfikatory sesji, preferencje motywu i dostępności
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: 'cele-i-podstawy',
    label: 'Cele i podstawy prawne przetwarzania',
    render: () => (
      <>
        <ul className="list-disc space-y-2 pl-5 marker:text-text-tertiary">
          <li>
            <strong className="font-semibold text-foreground">Świadczenie Usługi</strong> — art. 6 ust. 1
            lit. b RODO (wykonanie umowy). Obejmuje zakładanie konta, logowanie, zarządzanie organizacją,
            komunikację obsługową.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Rozliczenia i księgowość</strong> — art. 6
            ust. 1 lit. c RODO (obowiązek prawny) — przepisy podatkowe i o rachunkowości.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Zapewnienie bezpieczeństwa</strong> — art. 6
            ust. 1 lit. f RODO (uzasadniony interes) — wykrywanie nadużyć, ochrona przed atakami,
            rate-limiting, logowanie zdarzeń bezpieczeństwa.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Rozwój produktu i analityka</strong> — art. 6
            ust. 1 lit. f RODO, na podstawie danych zanonimizowanych lub zagregowanych.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Komunikacja marketingowa</strong> — art. 6
            ust. 1 lit. a RODO (zgoda) oraz art. 10 ustawy o świadczeniu usług drogą elektroniczną. Zgodę
            można wycofać w każdej chwili.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dane zdrowotne Pacjentów</strong> — art. 9
            ust. 2 lit. h RODO w zw. z ustawą o prawach pacjenta oraz ustawą o zawodzie fizjoterapeuty;
            w ramach powierzenia przez Użytkownika (administratora).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'odbiorcy',
    label: 'Odbiorcy danych i podmioty przetwarzające',
    render: () => (
      <>
        <p>
          Dane powierzamy wyłącznie zaufanym dostawcom, z którymi zawarliśmy umowy powierzenia przetwarzania
          (art. 28 RODO). Aktualna lista podprocesorów publikowana jest w panelu Organizacji. Kluczowi
          dostawcy:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            <strong className="font-semibold text-foreground">Clerk</strong> — uwierzytelnianie i zarządzanie
            tożsamością.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Vercel</strong> — hosting aplikacji webowej
            i CDN (region EU).
          </li>
          <li>
            <strong className="font-semibold text-foreground">Operator chmurowy (EU)</strong> — infrastruktura
            backendu .NET i bazy PostgreSQL, szyfrowanie danych w spoczynku.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Stripe</strong> — procesor płatności
            (PCI-DSS Level 1).
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dostawcy e-mail i powiadomień push</strong> —
            komunikacja transakcyjna.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dostawcy usług AI</strong> — funkcje
            generatywne; dane wejściowe są minimalizowane i nie są wykorzystywane do trenowania modeli,
            o ile nie wskazano inaczej.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dostawca monitoringu i error trackingu</strong>
            {' '}— rejestrowanie logów i błędów technicznych.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'transfer',
    label: 'Przekazywanie danych poza EOG',
    render: () => (
      <>
        <p>
          Co do zasady dane przetwarzane są w Europejskim Obszarze Gospodarczym. Jeżeli niektóre narzędzia
          wymagają transferu poza EOG (np. wybrani dostawcy AI z USA), stosujemy mechanizmy zabezpieczające:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            Standardowe Klauzule Umowne (SCC 2021/914) oraz — gdy ma zastosowanie — decyzje w sprawie
            odpowiedniego stopnia ochrony (np. <em>EU-US Data Privacy Framework</em>).
          </li>
          <li>środki dodatkowe: szyfrowanie end-to-end w tranzycie, pseudonimizacja, audyty dostępu.</li>
          <li>
            oceny skutków transferu (Transfer Impact Assessment) dla transferów wysokiego ryzyka.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'retencja',
    label: 'Okresy przechowywania (retencja)',
    render: () => (
      <>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            <strong className="font-semibold text-foreground">Dane konta Użytkownika</strong> — przez czas
            trwania umowy oraz do 12 miesięcy po jej rozwiązaniu (w celu obsługi reaktywacji, reklamacji),
            chyba że Użytkownik zażąda wcześniejszego usunięcia.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dane rozliczeniowe i faktury</strong> — 5 lat
            od końca roku podatkowego (obowiązek prawny).
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dane Pacjentów</strong> — przez okres
            wskazany przez Użytkownika (administratora); po rozwiązaniu umowy dane są eksportowane lub
            usuwane w terminie 30 dni.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Logi bezpieczeństwa i audytowe</strong> —
            do 24 miesięcy.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Dane z cookies analitycznych</strong> — zgodnie
            z ustawieniami danego dostawcy, nie dłużej niż 24 miesiące.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Kopie zapasowe</strong> — rotowane, usuwane
            automatycznie najpóźniej po 90 dniach.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'prawa',
    label: 'Twoje prawa',
    render: () => (
      <>
        <p>Zgodnie z RODO masz prawo do:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>dostępu do swoich danych i otrzymania ich kopii (art. 15),</li>
          <li>sprostowania nieprawidłowych danych (art. 16),</li>
          <li>usunięcia danych (art. 17) — „prawo do bycia zapomnianym”,</li>
          <li>ograniczenia przetwarzania (art. 18),</li>
          <li>przenoszenia danych (art. 20),</li>
          <li>
            sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie administratora (art. 21),
          </li>
          <li>wycofania zgody w każdym momencie (art. 7 ust. 3) — bez wpływu na wcześniejszą zgodność z prawem,</li>
          <li>
            wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa,{' '}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="https://uodo.gov.pl"
              target="_blank"
              rel="noreferrer"
            >
              uodo.gov.pl
            </a>
            ).
          </li>
        </ul>
        <p>
          Wnioski realizujemy bez zbędnej zwłoki, nie później niż w ciągu 30 dni. W uzasadnionych przypadkach
          (złożoność, liczba wniosków) termin ten może zostać przedłużony o kolejne 60 dni — poinformujemy
          o tym w ciągu pierwszego miesiąca.
        </p>
        <p>
          Aby zrealizować prawo, skontaktuj się z nami:{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="mailto:iod@fiziyo.pl">
            iod@fiziyo.pl
          </a>
          . W celu weryfikacji tożsamości możemy poprosić o dodatkowe informacje.
        </p>
      </>
    ),
  },
  {
    id: 'pacjenci',
    label: 'Dane Pacjentów — zasady szczególne',
    render: () => (
      <>
        <p>
          Gdy Pacjent korzysta z aplikacji fizjo-app w związku z przypisanym planem terapeutycznym, jego dane
          przetwarzane są na zlecenie Użytkownika (gabinetu / terapeuty). W takim modelu:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>administratorem danych Pacjenta jest Użytkownik, a FiziYo pełni rolę procesora,</li>
          <li>
            Pacjent może realizować swoje prawa kontaktując się bezpośrednio z gabinetem; Usługodawca
            pomaga w technicznej realizacji tych żądań,
          </li>
          <li>
            dane osób niepełnoletnich są przetwarzane wyłącznie za zgodą przedstawiciela ustawowego lub na
            innej podstawie prawnej przewidzianej w ustawie o prawach pacjenta,
          </li>
          <li>
            dostęp do danych Pacjentów mają wyłącznie upoważnieni Użytkownicy w ramach danej Organizacji
            oraz personel techniczny Usługodawcy — w minimalnym zakresie niezbędnym do wykonania Usługi.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    label: 'Pliki cookies i technologie śledzące',
    render: () => (
      <>
        <p>Platforma wykorzystuje następujące kategorie plików cookies:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            <strong className="font-semibold text-foreground">Niezbędne</strong> — wymagane do działania
            logowania, bezpieczeństwa, zapamiętywania preferencji motywu i dostępności. Nie można ich wyłączyć.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Funkcjonalne</strong> — zapamiętują wybory
            Użytkownika (np. ostatnio przeglądany moduł).
          </li>
          <li>
            <strong className="font-semibold text-foreground">Analityczne</strong> — zagregowane statystyki
            użycia, uruchamiane wyłącznie po uzyskaniu zgody.
          </li>
        </ul>
        <p>
          Preferencje dotyczące cookies można zmienić w panelu ustawień oraz w konfiguracji przeglądarki.
          Wyłączenie cookies niezbędnych może skutkować brakiem możliwości korzystania z Platformy.
        </p>
      </>
    ),
  },
  {
    id: 'bezpieczenstwo',
    label: 'Bezpieczeństwo przetwarzania',
    render: () => (
      <>
        <p>Stosujemy środki techniczne i organizacyjne adekwatne do ryzyka, w szczególności:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>szyfrowanie transmisji (TLS 1.2+) i szyfrowanie danych w spoczynku (AES-256),</li>
          <li>uwierzytelnianie wieloskładnikowe (MFA) oraz kontrolę dostępu opartą na rolach (RBAC),</li>
          <li>izolację danych między Organizacjami (tenant isolation) na poziomie aplikacji i bazy danych,</li>
          <li>regularne kopie zapasowe, szyfrowanie backupów i testy odtwarzania,</li>
          <li>
            cykliczne przeglądy bezpieczeństwa, testy penetracyjne oraz automatyczny skan podatności
            w zależnościach (SCA, SAST, DAST),
          </li>
          <li>
            rejestrowanie zdarzeń, monitoring anomalii oraz procedurę reagowania na incydenty (w tym
            zgłaszanie naruszeń do PUODO w ciągu 72 godzin zgodnie z art. 33 RODO).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'decyzje-automatyczne',
    label: 'Decyzje automatyczne i profilowanie',
    render: () => (
      <>
        <p>
          Platforma nie podejmuje decyzji wywołujących skutki prawne wobec osoby w sposób wyłącznie
          zautomatyzowany w rozumieniu art. 22 RODO. Funkcje AI służą wsparciu terapeuty — wszystkie
          decyzje kliniczne podejmuje człowiek.
        </p>
      </>
    ),
  },
  {
    id: 'naruszenia',
    label: 'Naruszenia ochrony danych',
    render: () => (
      <>
        <p>
          W przypadku wykrycia naruszenia ochrony danych osobowych podejmujemy natychmiastowe działania
          zmierzające do ograniczenia skutków, analizy przyczyn i wdrożenia środków naprawczych. Jeżeli
          naruszenie skutkuje wysokim ryzykiem naruszenia praw lub wolności osób fizycznych:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            zgłaszamy incydent Prezesowi UODO w ciągu 72 godzin od jego wykrycia (art. 33 RODO),
          </li>
          <li>informujemy Użytkowników (administratorów) oraz osoby, których dane dotyczą (art. 34 RODO),</li>
          <li>publikujemy <em>post-mortem</em> w panelu statusu i rekomendacje zaradcze.</li>
        </ul>
        <p>
          Jeżeli podejrzewasz incydent lub nadużycie, skontaktuj się z nami:{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="mailto:security@fiziyo.pl">
            security@fiziyo.pl
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'zmiany',
    label: 'Zmiany polityki prywatności',
    render: () => (
      <>
        <p>
          Polityka prywatności może być aktualizowana w związku ze zmianą przepisów, rozbudową Platformy
          lub zmianą dostawców. O istotnych zmianach informujemy z 14-dniowym wyprzedzeniem e-mailem oraz
          komunikatem w panelu. Historia wersji prowadzona jest w repozytorium produktowym — aktualna
          wersja oznaczona jest w nagłówku dokumentu.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  const tocItems: TocItem[] = sections.map(({ id, label }) => ({ id, label }));

  return (
    <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_240px]">
      <article
        aria-labelledby="privacy-title"
        data-testid="legal-privacy-article"
        className="min-w-0"
      >
        {/* Hero */}
        <div className="mb-10 border-b border-border/60 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Prywatność i RODO
          </div>
          <h1
            id="privacy-title"
            className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Polityka prywatności
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Jasno i transparentnie wyjaśniamy, jakie dane zbieramy, w jakim celu i jakie masz prawa jako
            Użytkownik oraz Pacjent korzystający z Platformy FiziYo.
          </p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Obowiązuje od
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{EFFECTIVE_FROM}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ostatnia aktualizacja
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{LAST_UPDATED}</dd>
            </div>
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Wersja dokumentu
              </dt>
              <dd className="mt-1 font-mono text-sm font-medium text-foreground">v{DOCUMENT_VERSION}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PrintButton testId="legal-privacy-print-btn" />
            <a
              href="mailto:iod@fiziyo.pl"
              data-testid="legal-privacy-dpo-link"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Inspektor Ochrony Danych → iod@fiziyo.pl
            </a>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section, index) => (
            <LegalSection
              key={section.id}
              id={section.id}
              index={index + 1}
              title={section.label}
            >
              {section.render()}
            </LegalSection>
          ))}
        </div>
      </article>

      <aside className="print:hidden">
        <TableOfContents items={tocItems} testId="legal-privacy-toc" />
      </aside>
    </div>
  );
}
