# Widok czatu – test użyteczności oczami fizjoterapeuty (DEV, 2026-11-01)

Strona z raportem (claude.ai, prywatna – dostęp przez Share): https://claude.ai/artifact/9BagFH4pEW3DYq53PQQUZD
Specyfikacja czatu: [SPEC-031](../../specs/SPEC-031-2026-10-30-chat-view.md).

Tester: fizjoterapeuta (symulacja), konto E2E Terapeuta, org FiziYo E2E DEV, Brave, AI włączone (Haiku przez OpenRouter).
Scenariusze: [SCENARIUSZE.md](SCENARIUSZE.md). Zużycie: 29 kredytów AI (500 → 471), ok. 45 wiadomości.
Zrzuty-dowody: [zrzuty/](zrzuty/).

## Werdykt w jednym akapicie

Jako fizjo **chciałbym tego używać**: ułożenie zestawu słowami („zestaw na lędźwie, 15 min, bez sprzętu, łagodnie”)
i dopięcie harmonogramu pigułkami to realnie mniej klikania niż kreator, a karta „Gotowe do wysłania” jest świetna.
Ale dziś **nie zaufałbym mu przy pacjencie**: raz ułożył zestaw na kartę innego pacjenta, kilka razy twierdził, że coś
„zapisał”, choć nic się nie stało, a o istniejącym pacjencie nie umie powiedzieć, jakie ćwiczenia ma w planie.
Czat jest dobry w **tworzeniu od zera**, słaby w **prowadzeniu pacjenta w czasie** (kontrola, progresja, modyfikacja) –
a to jest 70% mojej pracy z pacjentem domowym.

## Co działa dobrze (zostawić)

- **Ułożenie zestawu z opisu klinicznego** – trafne ćwiczenia, rozumie angielskie nazwy (bird dog, dead bug, clamshell,
  side plank), literówki i odmianę („kolno dla skibinskiego” → Arystarch Skibiński), dobór wariantów „łagodnie”.
- **Dodawanie/usuwanie ćwiczeń zdaniem** („dodaj mostek i bird dog, usuń rozciąganie czworobocznego”) – działa.
- **Karta „Gotowe do wysłania”** – start / czas / rytm segmentami, wyliczony koniec planu, jasna informacja, że plan nie
  trafia do katalogu. Najlepszy element całego przepływu.
- **Edycja parametrów w karcie** (wspólne pola z panelu) z przeliczaniem czasu dziennie.
- **Uczciwe „nie umiem”** przy wizytach/fakturach i przy odczycie parametrów planu; nie wymyśla funkcji kalendarza.
- **Pytanie kliniczne** (rwa kulszowa + gruszkowaty) – rozsądna, ostrożna odpowiedź, decyzja zostawiona fizjo.
- Panel kontekstu pacjenta, chip pacjenta w nagłówku, historia rozmów według dni, rozmowa otwiera się na ostatniej wiadomości.

## P0 – blokery zaufania (naprawić przed pokazaniem fizjo)

| # | Problem | Jak odtworzyć | Dowód |
|---|---|---|---|
| P0-1 | **Zestaw ułożony na złego pacjenta.** Po dodaniu nowego pacjenta w wątku model przypisał zestaw do „E2E Pacjent”, a w tekście pisze „dla Jana Kowalskiego”. Jedno „Dalej → Wyślij” i plan trafia do obcej osoby. | „dodaj pacjenta Jan Czat-Kowalski i od razu ułóż mu zestaw: clamshell…” → Dodaj pacjenta → Ułóż zestaw → wpisz ćwiczenia | `04-zestaw-dla-zlego-pacjenta.jpg` |
| P0-2 | **Model ogłasza zapisy, których nie było.** „Zapisuję harmonogram w zestawie” (nic nie zapisał, wrócił do szkicu), „Nazwę planu zapisuję w notatce zestawu” (nic), „wyprosty 2×10” tylko w podtytule karty, a ćwiczenie dalej 3×10. Spec mówi: wszystko, co zmienia dane, jest kartą – tekst modelu łamie tę zasadę. | W1: po wyborze pacjenta wpisz harmonogram tekstem; po wysłaniu „nazwij plan …” | transkrypt W1 |
| P0-3 | **Pętla „Który zestaw?”.** Kliknięcie opcji idzie do modelu jako tekst, podmiana aliasów dubluje nazwisko („Nowy zestaw · Anna Czat-Nowak-Anna Czat-Nowak”), model „nie znajduje” zestawu i pyta znowu. Każdy klik = kredyt, wynik zero. | „daj Arystarchowi ten sam zestaw co ma Anna Czat-Nowak” → kliknij zestaw Anny (2×) | `02-petla-ktory-zestaw.jpg` |
| P0-4 | **Wyciek aliasów do UI i tekstu.** Przyciski „pacjent” / „pacjent”, zdania „dla pacjent”, „do pacjent”, „nie podał Pan(i) aliasu”, „po aliasie (pacjent, pacjent)”, „Alias E2E Pacjent bierzemy z Twojej wiadomości”. | Wróć do starej rozmowy po przeładowaniu i zapytaj „ile ćwiczeń ma jej plan?” | `05-aliasy-pacjent-pacjent.jpg` |
| P0-5 | **Skan wizyty myli ćwiczenia.** „Unoszenie prostej nogi w leżeniu” (po ACL – na plecach) dopasowane z ✓ do „unoszenia prostej nogi w leżeniu **na brzuchu**”. Jednocześnie napinanie czworogłowego, mostek i przysiad przy ścianie oznaczone „brak w katalogu” (zwykłe wyszukiwanie je znajduje) → przycisk „Utwórz” robi duplikaty. Dawki z notatki (3×15, 3×10…) przepadają. | Skanuj wizytę → notatka ACL z SCENARIUSZE W2 | `03-skan-wizyty-dopasowania.jpg` |
| P0-6 | **Karta pacjenta pokazuje placeholder jak wartość.** Telefon „600 100 200” w karcie to placeholder (szary), pole puste; powód pusty. Model pisze „nie mam dla nich osobnych pól”, choć karta je ma. Fizjo klika „Dodaj” w przekonaniu, że telefon jest zapisany. Model zmienił też nazwisko „Czat-Kowalski” → „Kowalski”. | „dodaj pacjentkę Anna Czat-Nowak, tel 600 100 200, ból lędźwi…” | `01-telefon-placeholder.jpg` |

## P1 – braki, które zabierają najwięcej czasu fizjo

1. **Czat nie zna aktualnego planu pacjenta.** „Co ma i jak mu idzie?” → tylko „bez treningu od 19 dni”. „Pokaż ćwiczenia z jego
   zestawu” → „nie odczytam”. „Przedłuż o 2 tygodnie, +5 powtórzeń” → „nie wykonam”, a po „tak, przygotuj” model **zgaduje**
   („wygląda na obecny plan… nie mam pewności”). Wizyta kontrolna = główny przypadek pacjenta domowego → potrzebna karta
   „Plan pacjenta” (ćwiczenia, dawki, adherencja, ból z ostatnich 2 tyg.) + akcje: przedłuż, zmień dawkę, zamień ćwiczenie,
   zakończ, skopiuj innemu pacjentowi.
2. **Model nie może zmieniać parametrów.** Każda prośba „2×10”, „+5”, „3 s przytrzymania” kończy się „ustawisz na karcie”.
   To najczęstsza zmiana w gabinecie; spec ma `setDraft` z parametrami – trzeba je wystawić modelowi.
3. **Model nie wie, co zrobiły karty.** Po „Zapisz w katalogu” mówi „zestaw nie jest jeszcze w katalogu”; po dodaniu pacjenta
   zapomina listę ćwiczeń z tej samej wiadomości („od razu ułożę” → pusty szkic); po przeładowaniu traci kontekst (chip
   pacjenta jest, model pyta „o kogo chodzi?”). Wyniki kart (SetSaved, PatientAdded, Sent) powinny wracać do sesji AI.
4. **Kontekst pacjenta nie jest używany.** „Ułóż jej zestaw” przy chipie Anna → karta „Wybierz pacjenta” i lista, na której
   Anna jest ostatnia. Pacjent z chipa powinien być domyślny (z możliwością zmiany).
5. **Wpisanie tekstem zamiast pigułki cofa przepływ.** „Od poniedziałku, pon/śr/pt przez 6 tygodni” na etapie harmonogramu
   → nowa karta szkicu, ręczna zmiana dawki przepada. Tekst w trakcie kroku powinien wypełnić bieżącą kartę.
6. **Brak nazwy zestawu.** Wszystko nazywa się „Nowy zestaw” (plan Anny, szablon szyi, plan E2E). Katalog szybko staje się
   bezużyteczny i właśnie przez to model myli zestawy (P0-3). Nazwa z opisu (np. „Lędźwie – start”) + edycja w karcie.
7. **Pacjent bez aplikacji.** Po wysłaniu: „Anna zobaczy plan w aplikacji” – nie ma konta. Brakuje kroku „Połącz z aplikacją /
   kod QR / SMS” (panel to ma, czat mówi „nie umiem generować QR”). Dla nowego pacjenta to ostatni, kluczowy krok wizyty.
8. **Szablon = ćwiczenie.** „Zrób szablon do katalogu: szyja dla biurowych” → karta „Nowe ćwiczenie”. Trzeba było dopisać
   „nie ćwiczenie, tylko zestaw bez pacjenta”. W trybie bez AI: „Tego jeszcze nie umiem” (a umie – „Zapisz w katalogu”).
9. **Brak podglądu ćwiczenia.** W wynikach i w zestawie klik w kafelek tylko zaznacza/odznacza; nazwy ucięte, miniatury małe.
   Fizjo musi zobaczyć zdjęcie A|B / film / opis, zanim wyśle pacjentowi.
10. **Niespójne liczby „problemowych” pacjentów.** Badge w menu: 6, „Dziś”: 1 sprawa, „kto nie ćwiczy”: 5. Nowo dodany
    pacjent od razu „wymaga uwagi”; Anna z planem od jutra – „brak aktywności”. „Przypomnij” proponowane pacjentom bez aplikacji.
11. **Czas sesji niekontrolowany.** Zestaw na przedni ból kolana: **ok. 43 min dziennie** bez ostrzeżenia; W1 prosiłem 15 min,
    dostałem 11 (tekst modelu: „około 15 minut”). Karta powinna ostrzec przy rozjeździe z prośbą.

## P2 – drobne, ale irytujące

- Wątek nie przewija się do nowej odpowiedzi/karty – po prawie każdej wiadomości trzeba klikać ↓; strzałka ↓ zasłania tekst
  stopki karty.
- Stara karta szkicu zostaje aktywna obok nowej (dwa „Wybierz pacjenta” w wątku); po przeładowaniu karta oznaczona
  „Ten zestaw jest już w kolejnym kroku” znów ma aktywne przyciski → ryzyko podwójnego wysłania (nie klikałem).
- Ikony parametry/zamień/usuń w wierszu ćwiczenia widoczne tylko po najechaniu (tablet = brak hover).
- „(demo)” w nazwach ćwiczeń widoczne w zestawie dla pacjenta.
- Gramatyka: „Wskaż zestaw, który ma wysłać Arystarch Skibiński”, forma „Pan(i)”, mieszanie „Ty” i „Pan(i)”.
- Wynik zapisu pacjenta to tylko „Pacjent dodany.” – bez podsumowania, co zapisano (telefon, powód).
- Walidacja „podaj telefon albo e-mail” dopiero po kliknięciu „Dodaj”; model o niej nie wie.
- Opis nowego ćwiczenia zawiera dawkę liczbami (sprzeczne z DEC-014), formularz wziął 10 powtórzeń zamiast 8 i 0 s przytrzymania
  zamiast 3 s; brak „na stronę”; brak ostrzeżenia o podobnym ćwiczeniu w katalogu.
- Opóźnienia: proste pytanie 3–5 s, ułożenie zestawu 12–20 s, skan notatki ~40 s – bez paska postępu poza „Jeszcze chwila…”.
- Tuż po załadowaniu strony pierwsze wpisane znaki (ASCII) zniknęły z pola – zostały tylko polskie litery; później nie
  powtórzyło się (do potwierdzenia, możliwy remount kompozytora po doładowaniu danych).
- Tryb bez AI: „ułóż zestaw na kolano” szuka po słowie „kolan” (pompki na kolanach, podpory) – klinicznie bez sensu;
  „daj Arystarchowi ten sam zestaw…” → wyszukiwanie frazy „arystarchowi ten sam”.

## Wyniki scenariuszy

| Scenariusz | Wynik | Uwagi |
|---|---|---|
| W1 nowy pacjent, lędźwie | ✅ z obejściami | 7 wiadomości/kliknięć do wysyłki; ręcznie telefon i powód; harmonogram tylko pigułkami; brak QR |
| W2 ACL ze skanu notatki | ⚠️ | Błędne dopasowanie SLR, fałszywe „brak w katalogu”, dawki zgubione, pacjent nieutworzony |
| W3 wizyta kontrolna | ❌ | Czat nie zna planu, nie zmieni dawek, nie przedłuży; zgaduje zestaw |
| W4 ten sam zestaw innemu | ❌ | Pętla „Który zestaw?” (P0-3) |
| W5 szablon gabinetu | ⚠️ | Za 2. razem; zapis jako „Nowy zestaw”; model potem twierdzi, że szablonu nie ma |
| W6 katalog i nowe ćwiczenie | ⚠️ | Wyniki OK, brak podglądu; formularz ćwiczenia z błędnymi parametrami |
| W7 między wizytami | ⚠️ | „Kto nie ćwiczy” działa; „komu kończy się plan” i „co mam dziś” – nie (choć ekran startowy to liczy) |
| W8 trudne wejścia | ✅/❌ | Literówki, EN nazwy, pytanie kliniczne, zakres – dobrze; złożone polecenie → zły pacjent (P0-1) |

## Największe możliwości (kolejność wg wartości dla fizjo)

1. **Karta „Plan pacjenta” jako centrum wizyty kontrolnej** – ćwiczenia z dawkami, adherencja tygodniowa, ból, ostatnia
   notatka; akcje: przedłuż, progresja (+serie/+powt./trudniejszy wariant), zamień ćwiczenie, wyślij zmianę. To zamienia
   czat z „kreatora zestawów” w asystenta prowadzenia terapii.
2. **Zasada „tekst modelu nigdy nie mówi zapisuję”** + walidator w backendzie odrzucający zdania o zapisie bez karty.
   Szybka wygrana dla zaufania.
3. **Twarde wiązanie pacjenta i zestawu po ID** (opcje Clarify niosą ID, nie tekst; nowy pacjent od razu dostaje alias w sesji;
   chip kontekstu = domyślny pacjent). Usuwa P0-1, P0-3, P0-4.
4. **Model edytuje bieżący szkic** (parametry, nazwa, harmonogram tekstem) zamiast generować nowe karty.
5. **Domknięcie wizyty nowego pacjenta**: po wysyłce „Pacjent nie ma aplikacji → pokaż QR / wyślij SMS / wydrukuj zestaw (PDF)”.
6. **Skan wizyty z dawkami i progiem pewności**: dopasowanie z wyszukiwarką czatu (ta sama co „znajdź”), dawki z notatki do
   szkicu, przy niepewnym dopasowaniu „czy chodziło o…?” zamiast ✓, przeciwwskazania z notatki jako filtr („unikać OKC 90–45”).
7. **Podgląd ćwiczenia w karcie** (zdjęcie A|B, film, opis dla pacjenta) i stałe ikony akcji (tablet).
8. **Strażnik czasu i obciążenia**: ostrzeżenie, gdy czas dzienny odbiega od prośby, i sugestia skrócenia.

## Czego nie testowałem

Dyktowanie (mikrofon), dokument PDF/zdjęcie zaleceń (tylko notatka tekstem), widok mobilny/tablet, wysyłka przypomnień (nie
klikałem „Przypomnij” – realne push), widok pacjenta w aplikacji po wysłaniu planu, Stop i edycja wiadomości.

## Dane testowe utworzone na DEV (org FiziYo E2E DEV)

- Pacjenci: **Anna Czat-Nowak** (tel. 600100200, plan „Nowy zestaw · Anna Czat-Nowak” 2.11–13.12, 3×/tydz.),
  **Jan Czat-Kowalski** (jan.czat-kowalski@example.com, bez planu).
- Szablon w katalogu gabinetu: **„Nowy zestaw”** (szyja dla biurowych, 4 ćwiczenia).
- Nic nie wysłano do Przemek DevTest ani E2E Pacjent; żadnych przypomnień.

## Stan na 12.11

Statusy z kodu i testów w repo (portal `2d0a694`, fizjo-app `c87f803` + PR [fizjo-app#455](https://github.com/Prezentytu/fizjo-app/pull/455)), bez ponownego przejścia scenariuszy na DEV. Plan dalszych kroków: `plany-trello/07-blokery-czatu.md` w projekcie, karta Trello „Raport z testu czatu oczami fizjo”.

| #           | Status               | Gdzie                                                                                                                                                                                        | Co zostaje                                                                                                                                        |
| ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1        | naprawione           | backend `5a57d31`, `fd6dbae` (`ChatViewSpecValidator.Validate`, `ChatDispatchService.PatientsNamedIn`); portal `7ade044` (`guardCardPatient` w `src/features/ai-view/utils/resolveReply.ts`) | Model nie dostaje wyników kart (PatientAdded), więc po dodaniu pacjenta karta pyta „Dla kogo?” (PR-F, decyzja).                                   |
| P0-2        | naprawione w PR      | filtr `WithoutWriteClaims` od 04.11; fizjo-app#455 dokłada czas przyszły, „dodałem/usunąłem/utworzyłam/nazwałem”, „zapisano/dodano”, „został wysłany” i pole `note`                          | Merge #455.                                                                                                                                       |
| P0-3        | częściowo            | backend: dublowanie nazwiska usunięte (`IsNameJoint`), narzędzie `FindPatientSets` (`f5e1938`)                                                                                               | Opcja Clarify to dalej tekst: każdy klik kosztuje kredyt, a nazwy „Nowy zestaw · dd.MM” mogą się powtarzać. PR-B (ID w opcjach) czeka na decyzję. |
| P0-4        | naprawione           | backend (`Validate_UnknownAliasNeverReachesTheTherapistAsAWord`, `ValidateReply_DropsTextWithUnknownAliasOrTalkAboutAliases`)                                                                | brak                                                                                                                                              |
| P0-5        | naprawione w portalu | portal `4c1efde` (`utils/documentItems.ts`: `namesAgree`, wyszukiwarka dla pozycji bez dopasowania, `documentDoses`)                                                                         | Dopasowanie w imporcie backendu bez zmian.                                                                                                        |
| P0-6        | naprawione           | portal `utils/newPatientDetails.ts` + test                                                                                                                                                   | brak                                                                                                                                              |
| P1-1 (plan) | częściowo            | `FindPatientSets` daje nazwy, status i daty; fizjo-app#455 dokłada dawki z przypisania konkretnego pacjenta                                                                                  | Karta „Plan pacjenta” (PR-D) i akcje przedłuż, zmień dawkę (PR-E, decyzja).                                                                       |

Do powtórzenia na DEV po #455 i PR-B: W2, W3, W4, W8 (ok. 30 kredytów AI, za zgodą Adama).
