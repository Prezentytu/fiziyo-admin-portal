import type { Metadata } from 'next';
import { FileText } from 'lucide-react';
import { LegalSection } from '../_components/LegalSection';
import { PrintButton } from '../_components/PrintButton';
import { TableOfContents, type TocItem } from '../_components/TableOfContents';

export const metadata: Metadata = {
  title: 'Warunki użytkowania • FiziYo',
  description:
    'Regulamin świadczenia usług platformy FiziYo dla fizjoterapeutów i gabinetów medycznych.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '16 kwietnia 2026';
const EFFECTIVE_FROM = '1 maja 2026';
const DOCUMENT_VERSION = '2.0';

const sections: Array<TocItem & { render: () => React.ReactNode }> = [
  {
    id: 'definicje',
    label: 'Definicje',
    render: () => (
      <ul className="list-disc space-y-2 pl-5 marker:text-text-tertiary">
        <li>
          <strong className="font-semibold text-foreground">Usługodawca</strong> — FiziYo sp. z o.o.
          z siedzibą w Polsce, świadcząca Usługę w modelu SaaS za pośrednictwem domen{' '}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">portal.fiziyo.pl</code>{' '}
          oraz <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">app.fiziyo.pl</code>.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Usługa / Platforma</strong> — panel
          administracyjny FiziYo Admin oraz aplikacja mobilna fizjo-app, wraz z backendem i API, udostępniane
          w modelu <em>Software as a Service</em>.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Użytkownik</strong> — osoba fizyczna lub prawna
          (fizjoterapeuta, gabinet, organizacja medyczna), która założyła Konto w Platformie.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Pacjent</strong> — osoba fizyczna, której dane
          są przetwarzane w ramach Platformy przez Użytkownika pełniącego rolę administratora danych osobowych.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Organizacja</strong> — wyodrębniony obszar
          Platformy (tenant) skupiający Użytkowników i dane jednego gabinetu lub grupy terapeutów.
        </li>
        <li>
          <strong className="font-semibold text-foreground">Plan Subskrypcji</strong> — wariant odpłatnego
          dostępu do Usługi o określonym zakresie funkcjonalnym, liczbie miejsc i limitach (np. liczbie
          aktywnych Pacjentów, kredytów AI).
        </li>
      </ul>
    ),
  },
  {
    id: 'postanowienia-ogolne',
    label: 'Postanowienia ogólne',
    render: () => (
      <>
        <p>
          Niniejszy Regulamin określa zasady korzystania z Platformy FiziYo, prawa i obowiązki Użytkowników
          oraz Usługodawcy, a także zasady zawierania i rozwiązywania umów o świadczenie Usługi drogą
          elektroniczną w rozumieniu ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną.
        </p>
        <p>
          Akceptacja Regulaminu jest warunkiem koniecznym założenia Konta i korzystania z Usługi. Użytkownik
          oświadcza, że zapoznał się z Regulaminem oraz <em>Polityką prywatności</em> i akceptuje ich treść.
        </p>
        <p>
          Usługa jest kierowana do profesjonalistów (B2B) — podmiotów prowadzących działalność gospodarczą
          w obszarze fizjoterapii oraz osób wykonujących zawód medyczny. Platforma nie jest przeznaczona
          do użytku konsumenckiego w rozumieniu przepisów o prawach konsumenta, poza zakresem przewidzianym
          przez bezwzględnie obowiązujące przepisy prawa.
        </p>
      </>
    ),
  },
  {
    id: 'zakres-uslugi',
    label: 'Zakres usługi',
    render: () => (
      <>
        <p>Platforma udostępnia m.in. następujące funkcje:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>zarządzanie bazą ćwiczeń oraz zestawami ćwiczeń z asystą AI,</li>
          <li>tworzenie i przypisywanie planów terapeutycznych Pacjentom (Assignment Wizard),</li>
          <li>ewidencję Pacjentów i podstawową dokumentację terapii,</li>
          <li>generowanie materiałów PDF oraz kodów QR dla Pacjentów,</li>
          <li>rozliczenia, subskrypcje i zarządzanie limitami kredytów,</li>
          <li>aplikację mobilną fizjo-app, z której korzystają Pacjenci.</li>
        </ul>
        <p>
          Zakres funkcjonalny zależy od wybranego Planu Subskrypcji. Usługodawca zastrzega prawo do rozwijania,
          modyfikowania i wycofywania funkcji, zapewniając zachowanie ich istotnych cech w ramach obowiązującej
          umowy.
        </p>
      </>
    ),
  },
  {
    id: 'wymagania-techniczne',
    label: 'Wymagania techniczne',
    render: () => (
      <>
        <p>Do poprawnego korzystania z Platformy wymagane są:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            aktualna przeglądarka internetowa (Chrome, Edge, Firefox, Safari — co najmniej dwie najnowsze
            wersje stabilne) z włączoną obsługą JavaScript i cookies,
          </li>
          <li>aktywne i stabilne połączenie z internetem (rekomendowane ≥ 10 Mbps),</li>
          <li>urządzenie z rozdzielczością ekranu ≥ 1280 × 800 px dla panelu administracyjnego,</li>
          <li>
            dla aplikacji mobilnej: Android 9+ lub iOS 15+ z dostępem do sklepów Google Play / App Store.
          </li>
        </ul>
        <p>
          Usługodawca nie odpowiada za ograniczenia wynikające z konfiguracji urządzenia Użytkownika,
          oprogramowania antywirusowego, firewalli lub polityk sieciowych blokujących komunikację
          z Platformą.
        </p>
      </>
    ),
  },
  {
    id: 'konto-uzytkownika',
    label: 'Konto użytkownika',
    render: () => (
      <>
        <p>
          Rejestracja Konta odbywa się elektronicznie na stronie logowania lub na zaproszenie administratora
          Organizacji. Uwierzytelnianie realizuje dostawca tożsamości Clerk, a dostęp do zasobów backendu
          zabezpieczają własne tokeny JWT Usługodawcy.
        </p>
        <p>Użytkownik zobowiązuje się do:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>podania prawdziwych i aktualnych danych rejestracyjnych,</li>
          <li>zachowania poufności haseł i kodów jednorazowych (OTP),</li>
          <li>włączenia uwierzytelniania dwuskładnikowego, gdy jest dostępne,</li>
          <li>
            niezwłocznego powiadomienia Usługodawcy o podejrzeniu naruszenia bezpieczeństwa Konta
            (<a className="text-primary underline-offset-2 hover:underline" href="mailto:security@fiziyo.pl">security@fiziyo.pl</a>).
          </li>
        </ul>
        <p>
          Konta nieaktywne dłużej niż 24 miesiące mogą zostać zarchiwizowane; dane są wówczas usuwane zgodnie
          z <em>Polityką prywatności</em> oraz obowiązującymi przepisami.
        </p>
      </>
    ),
  },
  {
    id: 'obowiazki-uzytkownika',
    label: 'Obowiązki użytkownika i zakaz nadużyć',
    render: () => (
      <>
        <p>Zabronione jest wykorzystywanie Platformy do:</p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>działań niezgodnych z prawem, w tym naruszających prawa osób trzecich,</li>
          <li>
            udostępniania treści o charakterze bezprawnym, obraźliwym, dyskryminującym, pornograficznym lub
            wprowadzającym w błąd,
          </li>
          <li>
            automatyzowanego zbierania danych (scraping), obchodzenia limitów API, ataków DoS, prób
            uzyskania nieautoryzowanego dostępu do infrastruktury,
          </li>
          <li>
            odsprzedaży, wynajmu lub udostępniania dostępu do Konta osobom spoza Organizacji bez zgody
            Usługodawcy,
          </li>
          <li>
            wprowadzania do systemu złośliwego oprogramowania, plików wykonywalnych lub treści naruszających
            bezpieczeństwo innych Użytkowników.
          </li>
        </ul>
        <p>
          Użytkownik odpowiada za treści wprowadzane do Platformy, w szczególności za zgodność przetwarzania
          danych Pacjentów z przepisami RODO, ustawy o prawach pacjenta i ustawy o zawodzie fizjoterapeuty.
        </p>
      </>
    ),
  },
  {
    id: 'oplaty-i-platnosci',
    label: 'Opłaty, plany i płatności',
    render: () => (
      <>
        <p>
          Korzystanie z Usługi w zakresie wykraczającym poza plan bezpłatny wymaga wyboru odpłatnego Planu
          Subskrypcji. Aktualny cennik prezentowany jest w module <em>Rozliczenia</em> oraz w panelu
          <em> Subskrypcja</em> i stanowi integralną część umowy.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>
            Subskrypcja rozliczana jest w cyklach miesięcznych lub rocznych, z automatycznym odnowieniem do
            momentu rezygnacji.
          </li>
          <li>
            Płatności obsługują certyfikowani operatorzy (np. Stripe); Usługodawca nie przechowuje pełnych
            danych kart płatniczych.
          </li>
          <li>
            Brak opłaty w terminie skutkuje ograniczeniem funkcjonalności, a po 30 dniach — zawieszeniem
            Konta i archiwizacją danych.
          </li>
          <li>
            Kredyty AI (np. generowanie treści, transkrypcje) są konsumowalne i nie podlegają zwrotowi po
            wykorzystaniu.
          </li>
        </ul>
        <p>
          Ceny wyrażone są w PLN i powiększone o należny podatek VAT, o ile nie wskazano inaczej. Faktury
          wystawiane są elektronicznie.
        </p>
      </>
    ),
  },
  {
    id: 'wlasnosc-intelektualna',
    label: 'Własność intelektualna',
    render: () => (
      <>
        <p>
          Wszelkie prawa do Platformy, w tym kod źródłowy, grafiki, oznaczenia, interfejs oraz bazy ćwiczeń
          referencyjnych przysługują Usługodawcy lub jego licencjodawcom i podlegają ochronie prawnoautorskiej.
        </p>
        <p>
          Użytkownik otrzymuje niewyłączną, nieprzenoszalną licencję na korzystanie z Platformy w zakresie
          niezbędnym do prowadzenia działalności terapeutycznej, ograniczoną terytorialnie do obszaru
          świadczenia Usługi i czasowo do okresu trwania subskrypcji.
        </p>
        <p>
          Treści wprowadzane przez Użytkownika (np. własne ćwiczenia, notatki, zestawy) pozostają jego
          własnością. Udziela on Usługodawcy ograniczonej licencji wyłącznie w zakresie koniecznym do
          świadczenia Usługi (hosting, kopie zapasowe, wyświetlanie, udostępnianie powiązanym Pacjentom).
        </p>
      </>
    ),
  },
  {
    id: 'funkcje-ai',
    label: 'Funkcje wspierane przez sztuczną inteligencję',
    render: () => (
      <>
        <p>
          Platforma korzysta z modeli AI (m.in. do generowania opisów ćwiczeń, propozycji zestawów,
          transkrypcji). Wyniki mają charakter sugestii i <strong className="font-semibold text-foreground">nie zastępują wiedzy medycznej</strong>
          oraz oceny klinicznej fizjoterapeuty. Użytkownik ponosi pełną odpowiedzialność za decyzje
          terapeutyczne podjęte na podstawie treści wygenerowanych przez AI.
        </p>
        <p>
          Usługodawca podejmuje środki techniczne ograniczające ryzyko (walidacja, rate-limiting, moderacja),
          jednak nie gwarantuje pełnej bezbłędności generowanych treści. Użytkownik zobowiązany jest do
          weryfikacji ich zgodności z aktualną wiedzą medyczną oraz stanem zdrowia Pacjenta.
        </p>
      </>
    ),
  },
  {
    id: 'dostepnosc',
    label: 'Dostępność i utrzymanie',
    render: () => (
      <>
        <p>
          Usługodawca dąży do zapewnienia dostępności Platformy na poziomie <strong className="font-semibold text-foreground">99,5%</strong> w skali
          miesiąca kalendarzowego, z wyłączeniem zaplanowanych prac serwisowych oraz zdarzeń siły wyższej.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-text-tertiary">
          <li>Prace planowe są zapowiadane z co najmniej 48-godzinnym wyprzedzeniem.</li>
          <li>Awarie krytyczne są usuwane priorytetowo; status publikowany jest w panelu aplikacji.</li>
          <li>Kopie zapasowe wykonywane są codziennie i przechowywane w szyfrowanej formie.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'odpowiedzialnosc',
    label: 'Odpowiedzialność',
    render: () => (
      <>
        <p>
          W zakresie dopuszczalnym przez prawo odpowiedzialność Usługodawcy z tytułu umowy ogranicza się do
          szkód rzeczywistych (<em>damnum emergens</em>) i nie obejmuje utraconych korzyści (<em>lucrum cessans</em>),
          chyba że szkoda została wyrządzona umyślnie.
        </p>
        <p>
          Łączna odpowiedzialność Usługodawcy w danym roku kalendarzowym nie może przekroczyć sumy opłat
          netto wniesionych przez Użytkownika w ciągu 12 miesięcy poprzedzających zdarzenie szkodowe.
        </p>
        <p>
          Usługodawca nie odpowiada za skutki decyzji terapeutycznych Użytkownika, działania Pacjentów oraz
          za treści wprowadzane przez Użytkownika do Platformy.
        </p>
      </>
    ),
  },
  {
    id: 'reklamacje',
    label: 'Reklamacje',
    render: () => (
      <>
        <p>
          Reklamacje można zgłaszać w formie elektronicznej na adres{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="mailto:support@fiziyo.pl">
            support@fiziyo.pl
          </a>
          . Zgłoszenie powinno zawierać identyfikator Konta, opis nieprawidłowości oraz datę jej wystąpienia.
        </p>
        <p>
          Usługodawca rozpatruje reklamacje w terminie 14 dni roboczych od daty otrzymania kompletnego
          zgłoszenia. W sprawach wymagających dodatkowej analizy termin może zostać wydłużony do 30 dni,
          o czym Użytkownik zostanie poinformowany.
        </p>
      </>
    ),
  },
  {
    id: 'rozwiazanie-umowy',
    label: 'Rozwiązanie umowy',
    render: () => (
      <>
        <p>
          Użytkownik może w każdej chwili rozwiązać umowę poprzez dezaktywację Konta w panelu ustawień lub
          przesłanie oświadczenia na adres{' '}
          <a className="text-primary underline-offset-2 hover:underline" href="mailto:support@fiziyo.pl">
            support@fiziyo.pl
          </a>
          . Rozwiązanie umowy następuje z końcem bieżącego okresu rozliczeniowego.
        </p>
        <p>
          Usługodawca może wypowiedzieć umowę z 30-dniowym wyprzedzeniem w przypadku rażącego naruszenia
          Regulaminu, zalegania z opłatami powyżej 30 dni lub wykorzystywania Platformy niezgodnie z jej
          przeznaczeniem. W sytuacjach zagrożenia bezpieczeństwa Usługodawca może zablokować Konto
          ze skutkiem natychmiastowym.
        </p>
        <p>
          Po rozwiązaniu umowy Użytkownik ma 30 dni na pobranie danych (eksport), po którym zostają one
          usunięte zgodnie z polityką retencji.
        </p>
      </>
    ),
  },
  {
    id: 'zmiany-regulaminu',
    label: 'Zmiany regulaminu',
    render: () => (
      <>
        <p>
          Usługodawca zastrzega możliwość zmian Regulaminu z ważnych przyczyn (np. zmiana przepisów prawa,
          rozwój funkcjonalny, względy bezpieczeństwa). O zmianach Użytkownicy informowani są z co najmniej
          14-dniowym wyprzedzeniem — pocztą elektroniczną oraz komunikatem w Platformie.
        </p>
        <p>
          Kontynuacja korzystania z Usługi po wejściu zmian w życie oznacza ich akceptację. Użytkownik,
          który nie akceptuje zmian, może wypowiedzieć umowę ze skutkiem natychmiastowym przed datą
          wejścia zmian w życie.
        </p>
      </>
    ),
  },
  {
    id: 'postanowienia-koncowe',
    label: 'Postanowienia końcowe',
    render: () => (
      <>
        <p>
          Prawem właściwym dla Regulaminu jest prawo polskie. Spory wynikłe z umowy strony będą rozstrzygać
          polubownie; w razie braku porozumienia właściwy jest sąd miejsca siedziby Usługodawcy, chyba że
          bezwzględnie obowiązujące przepisy stanowią inaczej.
        </p>
        <p>
          Jeżeli którekolwiek postanowienie Regulaminu zostanie uznane za nieważne, pozostałe postanowienia
          zachowują moc, a nieważne zostaje zastąpione zapisem najbliższym jego celowi gospodarczemu.
        </p>
        <p>
          W sprawach nieuregulowanych stosuje się przepisy Kodeksu cywilnego, ustawy o świadczeniu usług
          drogą elektroniczną, RODO oraz inne właściwe przepisy prawa.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  const tocItems: TocItem[] = sections.map(({ id, label }) => ({ id, label }));

  return (
    <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_240px]">
      <article
        aria-labelledby="terms-title"
        data-testid="legal-terms-article"
        className="min-w-0"
      >
        {/* Hero */}
        <div className="mb-10 border-b border-border/60 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Dokument prawny
          </div>
          <h1
            id="terms-title"
            className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Warunki użytkowania
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Regulamin świadczenia usług platformy FiziYo dla fizjoterapeutów, gabinetów i organizacji
            medycznych.
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
            <PrintButton testId="legal-terms-print-btn" />
            <a
              href="mailto:legal@fiziyo.pl"
              data-testid="legal-terms-contact-link"
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Pytania dot. regulaminu → legal@fiziyo.pl
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
        <TableOfContents items={tocItems} testId="legal-terms-toc" />
      </aside>
    </div>
  );
}
