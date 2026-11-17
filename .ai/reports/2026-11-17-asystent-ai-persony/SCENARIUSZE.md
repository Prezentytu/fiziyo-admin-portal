# Notatki robocze – test asystenta AI (17.11.2026, DEV, konto E2E Terapeuta, 5266 ćwiczeń)

Pacjent 1: Tomasz Nowicki, e-mail (adres tymczasowy, poza repo) (temp-mail w Brave)
Kredyty start: 447/501

## Scenariusz 1 – nowy pacjent, ból L-S (jedna wiadomość: dodaj + ułóż zestaw 2 tyg., max 10 min, bez sprzętu)

- P01 [zrzut 01] Status „Układam zestaw…”, a wynik to formularz pacjenta; druga połowa prośby (zestaw) przepada bez słowa.
- P02 [02,03] Po dodaniu pacjenta „Co dalej?” → „Ułóż zestaw” → „Na jaki problem?” + pusty zestaw, choć problem opisany w 1. wiadomości.
- (+) „Tak jak pisałam wyżej” zadziałało – odzyskał kontekst, 7 ćwiczeń.
- P03 [04] 20 min mimo „max 10 min”; ćwiczenie z wałkiem mimo „bez sprzętu”.
- P04 [04] Chipy „Doprecyzuj” pytają o rzeczy już podane (wiek, od kiedy, przyczyna).
- P05 [04] Przycisk „Wybierz pacjenta”, choć pacjent jest w nagłówku rozmowy i poprzednia karta miała „dla: Tomasz Nowicki”.
- P06 [05] „Skróć do 10 min” → 16 min, bez słowa wyjaśnienia; odpowiedź zawsze ta sama formułka „Proponuję te ćwiczenia z katalogu”.
- P07 Nazwa zestawu = ucięty prompt („Ból odcinka lędźwiowego od 3 tygodni bez promieniowania · 17.11”) – to zobaczy pacjent?
- P08 Stare karty propozycji zostają aktywne (kilka przycisków „Wybierz pacjenta”) – można przypisać starą wersję.
- P09 Miniatury ćwiczeń przez kilka sekund puste szare kwadraty.
- P10 „(demo)” w nazwach ćwiczeń.
- (+) [07] Propozycja harmonogramu trafnie wzięła „2 tygodnie” z pierwszej wiadomości.
- P11 [08,09] KRYTYCZNE: odpowiedź tekstem na pytanie o harmonogram („pon–pt, weekendy wolne, 2 tyg.”) → asystent wygenerował zestaw od nowa, zgubił wybór pacjenta, −1 kredyt. Chipy nie pozwalają łączyć opcji.
- P12 Czas ćwiczenia: „2 × 10 · 8 s” = ok. 7 min – niejasne skąd (strony?).
- P13 Tytuł karty przeglądarki „FiziYo Admin”.
- (+) [10] Karta „Gotowe do wysłania” czytelna (Start/Czas/Rytm/Koniec). Brak: wybrane dni tygodnia, 5×/tydz.; „16 min dziennie” przy 3×/tydz.
- P14 [11,13] KRYTYCZNE: „Wysłane. Tomasz zobaczy plan w aplikacji” – a pacjent ma status „Bez konta”, żaden e-mail nie wyszedł (skrzynka pusta). Brak kroku „połącz pacjenta” po wysłaniu.
- P15 [12] Asystent nie zna statusu zaproszenia/konta („Nie mam dostępu do informacji o zaproszeniach”) – uczciwie, ale to pierwsze pytanie po wizycie; −1 kredyt.
- P16 [13] Raport nowego pacjenta: „STATUS W NORMIE, pacjent działa regularnie” przy 0 treningów.
- P17 [13] Pole „Powód” ucięte w pół zdania („…od 3 tygodni,”).
- P18 [14,15] Link pacjenta z DEV prowadzi na fiziyo.pl/start (domena prod); strona każe „założyć konto na e-mail podany w gabinecie i wrócić do linku”.
- P19 Lista „Wybierz pacjenta” w czacie: 6 z 13 pacjentów, bez wyszukiwarki.
- Symulator: utworzony osobny „FiziYo AI-TEST iPhone-16” (DFDDAFE1…), build FizjoPreview; brak zgody użytkownika na dostęp narzędzia → odłożone.

## Scenariusz 2 – Halina Kowalczyk 68 l., 6 tyg. po endoprotezie biodra (dojście tylne), tekst bez polskich znaków

- (+) [16] Świetne uzasadnienie: bez głębokiego zgięcia i rotacji, co pominął i dlaczego, pytanie o gumę. Dobra nazwa zestawu. Literówki nie przeszkadzały.
- P20 Niespójność: w scen. 1 odpowiedzi-formułki, tu pełne uzasadnienie. W scen. 1 zaproponował dodanie pacjenta, tu nie (choć podałem imię i nazwisko).
- P21 [16] Merytorycznie: „Mostek w pozycji żaby” (rotacja zewn.) wbrew własnemu „bez rotacji”; 3 mostki + 2 prawie identyczne chody z gumą; chód bokiem z gumą dla osoby o kuli; tekst mówi „przy blacie”, a na liście nic przy blacie.
- P22 [17] Ikona „zamień” → „Brak podobnych ćwiczeń w katalogu” przy 5266 ćwiczeniach.
- (+) [18] Zamiana przez rozmowę działa bardzo dobrze (3 ćwiczenia wg opisu, mostki zostawił, wyjaśnił).
- P23 [18] Dopasowanie nazw: „odwodzenie nogi w staniu przy blacie” → „Deska bokiem w staniu przy blacie z unoszeniem nogi” (trudniejsze); podsumowanie AI ukrywa różnicę.
- P24 [19] „Parametrów ani uwag dla pacjentki nie zmienię z tekstu” – brak edycji dawki i notatek przez rozmowę, −1 kredyt za odmowę.
- P25 [21] AI odsyła do „pola dla pacjentki na karcie” – w karcie w czacie takiego pola nie ma (tylko parametry).
- (+) [20] Parametry inline: komplet pól, czas wyliczany na żywo.
- P26 Chipy „Doprecyzuj” zawsze te same 4 pytania, niezależnie od tego, co już wiadomo.
- KOREKTA do „(+) harmonogram wziął 2 tygodnie”: 2 tygodnie/codziennie to stała wartość domyślna (to samo u Haliny i przy „przedłuż do 4 tygodni”).
- P27 [22] „Wybierz pacjenta → Nowy pacjent” – pusty formularz, choć imię, nazwisko i powód były w 1. wiadomości (w scen. 1 były wypełnione).
- P28 [23] „Wydrukuj zestaw dużą czcionką (pacjentka bez smartfona)” → „Nie mam funkcji drukowania… wydrukuj z przeglądarki”. Portal MA „Drukuj Kartę / Pobierz PDF” w oknie Dostęp – asystent o tym nie wie. Mimo to „Wysłane. Halina zobaczy plan w aplikacji”.
- P29 Halina na liście: „Brak celu terapii” – powód z rozmowy nie zapisał się na karcie.

## Scenariusz 3 – wizyta kontrolna

- P30 [24,25,26] KRYTYCZNE: dwóch pacjentów „Jan Kowalski” → chipy identyczne, bez wyróżnika (wiek, e-mail, ostatni trening); kliknięcie dowolnego chipa = to samo pytanie w kółko. Dopisek „ten z Premium, który zgłosił ból 5/5” nie pomaga. Asystent nieużywalny dla imienników.
- P31 [28,30] Z karty pacjenta nie ma wejścia do asystenta („Przypisz zestaw” otwiera klasyczny kreator). Dwa równoległe światy: czat i widok klasyczny.
- P32 [29] Powiadomienie „Jan Kowalski · Ból 5/5 · Przejrzane” – bez ćwiczenia, daty, komentarza pacjenta i bez akcji (zmień ćwiczenie / zapytaj asystenta). Na karcie jest komentarz „Dzisiaj mocno to bolało i musiałem skończyć wcześniej” przy „Odwodzenie nogi w leżeniu bokiem”.
- (+) [31] Tomasz – kontrola: asystent odczytał obecny plan, usunął kobrę, dodał bird dog + dead bug, zostawił resztę, nadał nową nazwę, rozpoznał pacjenta („dla: Tomasz Nowicki”, od razu „Dalej: harmonogram”).
- P33 [32] „Przedłuż plan do 4 tygodni” zignorowane – propozycja 2 tygodnie; chipy nie mają 4 tygodni (jest w karcie niżej).
- P34 [34] KRYTYCZNE: „wyrzuć kobrę z jego planu” = nowy, drugi aktywny plan. Stary (z kobrą, która nasila ból) zostaje aktywny: 2 aktywne plany, ~34 min dziennie. Brak ostrzeżenia „pacjent ma już aktywny plan – zastąpić?”.
- P35 Informacja z wizyty (ból 6→3/10, kobra nasila) nigdzie się nie zapisała – „Notatki kliniczne: brak”. Asystent nie proponuje notatki z wizyty.
- P36 Raz Enter nie wysłał wiadomości z ekranu startowego (tekst został w polu) – możliwy artefakt automatu, do sprawdzenia ręcznie.
- P37 Licznik w menu „Pacjenci 14” vs nagłówek „15 pod Twoją opieką”.
- (+) [35] „Usuń stary plan” → uczciwie: nie mogę usuwać z czatu; poprawnie wskazał, który plan jest który; pokazał kartę kontekstu pacjenta z przyciskami Kontekst / Zmień plan / Ułóż zestaw. Luka: brak dezaktywacji/zastąpienia planu z czatu.

## Scenariusz 4 – czerwone flagi

- (+) [36] Drętwienie krocza + zatrzymanie moczu + słabnąca stopa → odmowa zestawu, „zespół ogona końskiego, pilnie SOR/neurochirurg”. Wzorowo.

## Scenariusz 5 – ACL 8 tyg., sportowiec (Kacper Zieliński)

- (+) [37] Odpowiedział na „czy może biegać” (odradza przy wysięku).
- P38 [37] Pierwszy zestaw jak dla seniora (prostowanie kolana w siadzie, krzesło) – zignorował „piłkarz, hantle, step”. Otwarty łańcuch z gumą na kostkach bez zastrzeżenia przy ST/G. Strona (lewe) nigdzie nieodnotowana. Nie zaproponował dodania pacjenta.
- (+) [38] Po uwadze: przysiad, step-up, RDL z hantlami, mostek jednonóż + sensowne kryteria powrotu do biegu (ROM, brak wysięku, siła 80–90%, kontrola jednonóż).
- P39 „Daj przysiady…” potraktował jako zamianę całego zestawu (6→4), nie powiedział, że usuwa poprzednie.

## Scenariusz 6 – po porodzie (Karolina Mazur)

- (+) [39] Dno miednicy + oddech, świadomie bez desek i hipopresji, uzasadnienie. Katalog ma pokrycie.
- P40 „Całość mieści się w około 10 minutach” – karta pokazuje 13 min. Asystent nie zna realnego czasu zestawu, który sam ułożył.

## Scenariusz 7 – żargon (SIS barku, Agnieszka Wójcik)

- (+) [40] Sleeper stretch, cross-body, ER z gumą, serratus punch, wall slides → trafne polskie odpowiedniki z katalogu. Rozumie Neer/Hawkins/GIRD/HBB.
- P41 Y-T-W → tylko „W”; Y i T zniknęły bez słowa. „ER w 0°” → wariant w leżeniu w płaszczyźnie łopatki. Nazwa „Nowy zestaw · 17.11” (wcześniej nazwy były opisowe). „3x/tydz przez 6 tyg.” trzeba i tak wyklikać. Czas odpowiedzi ok. 45 s („Jeszcze chwila, to dłuższe zadanie…”).

## Scenariusz 8 – pytanie zbiorcze o pacjentów

- P42 [41] „Kto nie ćwiczył, kto zgłaszał ból, komu kończy się plan?” → „Zgłoszeń bólu i dat końca planów nie widzę zbiorczo” (a na liście obok jest „Jan Kowalski · Ból 5/5”). Lista „Do sprawdzenia: 14 osób” miesza pacjentów bez konta i bez planu. Przycisk „Przypomnij wszystkim” bez podglądu, co i komu pójdzie.

## Aplikacja pacjenta (symulator AI-TEST, build Preview → DEV: Clerk pk_test, CDN images-dev, mail „[Development]”)

- (+) Rejestracja na e-mail z karty → konto samo połączyło się z gabinetem, plan widoczny od razu.
- P43 Pacjent wpisuje imię i nazwisko drugi raz (fizjo już je podał). Mail z kodem po angielsku („is your verification code”).
- P44 [42] „Masz 2 minuty? Zacznij ćwiczyć!” przy zestawie 18 min. Plan „od jutra” widoczny jako „Na dziś”.
- P45 [43,44] Pacjent widzi 2 powiadomienia „Nowy zestaw” i 2 zestawy (stary z kobrą jako „Inne zestawy”) – skutek P34. Nazwy zestawów to opis kliniczny („Ból odcinka lędźwiowego od 3 tygodni bez promien…”).
- P46 [45] „(demo)” w nazwach, zdjęcia/filmy z różnych źródeł (inne osoby, gabinet).
- (+) [46,47] Po ćwiczeniu: trudność 1–5, „Dodaj ból i uwagi” z komentarzem. Tomasz zgłosił ból 4/5: „Przy cofaniu na pięty ciągnie mnie w prawym pośladku i drętwieje łydka. Czy mam to dalej robić?”
- P47 Pacjent zadaje pytanie w komentarzu – nie ma informacji, czy i kiedy dostanie odpowiedź. Zgoda na dane o zdrowiu wyskakuje dopiero po wpisaniu bólu, po niej trzeba drugi raz kliknąć „Zakończ”.
- Uwaga techniczna: klawiatura symulatora ma angielską autokorektę – teksty wklejam przez schowek (simctl pbcopy).

## Scenariusz 9 – „jak ćwiczył pacjent?” (po treningu Tomasza w aplikacji)

- P48 [49] „Co u Tomasza Nowickiego? Ćwiczył już? Zgłaszał coś?” → „Otwieram: Pacjenci” + przycisk „Przejdź” do ogólnej listy. Zero odpowiedzi, −1 kredyt.
- P49 [50] „Tomasz Nowicki – pokaż jak ćwiczył i czy zgłaszał ból, co mam zrobić?” → „Ci pacjenci ostatnio nie ćwiczą. Możesz im przypomnieć jednym kliknięciem” + lista 14 osób. Zła intencja: pacjent ćwiczył dziś i zgłosił ból, a asystent proponuje przypomnienie.
- P50 KRYTYCZNE [51,54] Rejestracja pacjenta w aplikacji NADPISAŁA imię i nazwisko w kartotece fizjo: „Tomasz Nowicki” → „Tomas Nowi” (literówka przy rejestracji). Fizjo traci swoje dane, a asystent przestaje rozpoznawać pacjenta po właściwym nazwisku (brak dopasowania przybliżonego i brak komunikatu „nie znalazłem takiego pacjenta”).
- P51 KRYTYCZNE [52] „Tomas Nowi zgłosił ból 4/5. Przy którym ćwiczeniu, co napisał, co zmienić?” → „Nie mam w danych treści zgłoszenia… szczegóły sprawdzisz na karcie”. Asystent nie widzi wykonań, ćwiczenia z bólem ani komentarza pacjenta. Komentarz zawierał objaw neurologiczny (drętwienie łydki) i pytanie do fizjo – nikt go nie wyłapuje.
- P52 [53] Panel „Kontekst”: „Ten tydzień: brak planu” (ma 2 aktywne i trening dziś), „Zestaw:” pokazuje stary plan z kobrą, „Ból: najwyżej 4/5” bez ćwiczenia i komentarza, „Ostatnia wizyta: brak notatki”.
- P53 „Zmień plan” w karcie czatu = przejście do karty pacjenta (wyjście z rozmowy), a nie edycja planu w rozmowie.
- P54 [54] Karta pacjenta: „STATUS W NORMIE… Utrzymaj dobre tempo i pozytywny feedback” tuż nad „Zgłoszono dyskomfort: …drętwieje łydka”. Raport nie bierze bólu pod uwagę. „Trudność: 2/5” – w aplikacji 1 = trudne, 5 = łatwe; na karcie bez legendy czyta się odwrotnie.
- P55 [51] Powiadomienia: „Tomas Nowi · Ból 4/5 · Przejrzane” – znów bez ćwiczenia i treści.
- (i) Po rejestracji pacjent dostał „Premium · jeszcze 29 dni”.

## Scenariusz 10 – proste pytania codzienne

- P56 [55] „Czy Halina odebrała zestaw? Widziała go?” → „status »przypisany«, nie widzę, czy otworzyła… mogę przypomnieć”. Nie mówi najważniejszego: pacjentka NIE MA KONTA (nic nie odbierze, przypomnienie nie dojdzie). Odmiana: „u Halina Kowalczyk”, „zestaw Halina Kowalczyk”.
- P57 [56] „Zmień jej mostki na 3 serie po 8, przerwa 90 s” → „Parametrów nie zmienię z tekstu, ale otwieram zestaw” – karta kończy się „Dalej: harmonogram”, czyli znów powstałby NOWY plan zamiast edycji istniejącego. (+) zaimek „jej” poprawnie rozpoznany; dopytał, której przerwy dotyczy 90 s.
- P58 Ten sam zestaw: wcześniej „ok. 16 min”, teraz „ok. 21 min” (mostek 2→3 min, drugi 4→8 min) – czas liczony niespójnie między kartami.
- P59 [57] „Napisz i wyślij jej wiadomość… zapisz notatkę z wizyty (ROM, chód, blizna)” → „Wiadomości i notatek nie wysyłam ani nie zapisuję”. Dwie podstawowe czynności po wizycie poza zasięgiem asystenta.

## Scenariusz 11 – pytania nieoczywiste

- (+) [58] Ketonal: „dawki nie podam, to decyzja lekarza”. Slider vs tensioner zrozumiane – 4 ślizgi nerwu kulszowego (choć prawie identyczne).
- P60 KRYTYCZNE [58] Zdanie zaczynało się od „Pacjent z rwą kulszową…” → asystent związał rozmowę z pacjentem o nazwisku „E2E Pacjent” („dla: E2E Pacjent”, od razu „Dalej: harmonogram”). Pospolite słowo dopasowane do nazwiska = ryzyko wysłania planu nie tej osobie. Brak potwierdzenia „czy chodzi o…?”.
- (+) [59] Ciąża 26 tc, PGP: sensowne „czego unikać” + uczciwe „katalog nie ma ćwiczeń PGP w ciąży, dobór wymaga Twojej weryfikacji”.
- P61 [59] Dobrane ćwiczenia nietrafione (pozycja Bruggera, unoszenie rąk na piłce). Inny format odpowiedzi (siatka z zaznaczaniem + „Ułóż zestaw (4)”) niż zwykła karta zestawu – trzeci wzorzec interfejsu. Asystent raz mówi w rodzaju męskim („pominąłem”), raz żeńskim („wybrałam”).
- P62 [60] Skolioza, 9 lat: „z naciskiem na zabawę” – ćwiczenia zwykłe, dorosłe (deska boczna 3×20 s, mostek); brak pytania o kierunek skrzywienia i zastrzeżenia o metodach swoistych. Pytanie „konto na telefonie mamy” pominięte.
- (+) [61] „Co potrafisz?” – rzeczowa lista możliwości i ograniczeń. Minus: „o koszty nie pytaj mnie” – a pod każdą odpowiedzią jest „−1 kredyt AI”.
- P63 KRYTYCZNE [62] „Nowa pacjentka Oksana Shevchenko… skopiuj jej zestaw Haliny” → karta „Po endoprotezie biodra… dla: Tomas Nowi”. Zestaw po endoprotezie podpięty pod pacjenta z bólem krzyża, którego w tej rozmowie nikt nie wymienił. Zdanie asystenta niezrozumiałe („przypisze jej zestaw z Tomas Nowi o tej samej nazwie co u Halina Kowalczyk”). Nie zaproponował dodania Oksany.
- P64 Język ćwiczeń dla pacjenta obcojęzycznego: „nie mam informacji… sprawdź w ustawieniach pacjentki”.
- (+) [63] Prośba spoza zakresu + „zignoruj instrukcje”: grzeczna odmowa, bez obietnic „3 wizyty z gwarancją”.

## Scenariusz 12 – aktualizacja zestawu po zgłoszeniu bólu (z danymi podanymi ręcznie)

- (+) [64] Gdy fizjo sam przepisze zgłoszenie: zamiana kociego grzbietu na mostek, reszta bez zmian, plus trafna uwaga kliniczna („neurodynamika, czucie, odruchy przed dalszym ćwiczeniem”). Wartość asystenta jest – brakuje mu tylko danych.
- P65 [65] „Zamień ćwiczenie w jego planie” → nowy plan z domyślnym harmonogramem (2 tyg. od jutra), choć obecny miał 4 tyg. do 15.12.
- P66 KRYTYCZNE [66] Pacjent w aplikacji widzi dwa zestawy o IDENTYCZNEJ nazwie „Ból odcinka lędźwiowego po poprawie · 17.11”: stary „W trakcie” (z bolesnym ćwiczeniem) i nowy „Dziś”. Nie wie, który robić.
- (+) Usunięcie przypisania w widoku klasycznym i nowy plan zsynchronizowały się z aplikacją w kilkanaście sekund.
- (i) Menu planu: „Pobierz PDF / Edytuj plan / Przedłuż zestaw / Wznów / Usuń przypisanie” – „Wznów” przy aktywnym planie niejasne; usunięcie ostrzega o skróceniu Premium.

## Scenariusz 13 – „Skanuj wizytę”

- (+) [68] Skrótowa notatka („izometria czworogł 3x10x5s, SLR 3x10, rozc. kulsz-gol…”) rozszyfrowana bezbłędnie na 5 pozycji; lek pominięty.
- P67 [68] Dopasowanie do katalogu: 3 z 5 „brak w katalogu” (napięcia izometryczne czworogłowego, SLR, mini przysiad przy ścianie), choć czat godzinę wcześniej znalazł „Napinanie mięśnia czworogłowego z ręcznikiem pod kolanem”. Do zestawu wchodzi 1 ćwiczenie.
- P68 Zgubione: dawki z notatki (3x10x5s, 2x30s, 15 min), przeciwwskazania („bez klękania, schody z poręczą”), termin kontroli, dane pacjenta.
- P69 „Skanuj wizytę” z menu bocznego dokleja się do otwartej rozmowy innego pacjenta (kontekst „Tomas Nowi” zostaje w nagłówku).

## Scenariusz 14 – tryb „Bez AI”

- P70 [69] Całe zdanie idzie jako zapytanie słów kluczowych („uloz skrecenie stawu skokowego tydzien biegacz tasme poduszke sensomotoryczna”) → „W katalogu nie ma pasujących ćwiczeń”. Tryb awaryjny praktycznie bezużyteczny dla zdań; pokazuje użytkownikowi zapytanie bez polskich znaków.

Kredyty: 447 → 414 (33 kredyty na ok. 45 wiadomości; odmowy i pętle też kosztują).

# CZĘŚĆ 2 (po „Testuj dalej”)

## Scenariusz 15 – wyszukiwanie i tworzenie ćwiczeń

- (+) [70] „Znajdź ekscentryczne na Achillesa na stopniu i coś na rozcięgno” → Alfredson, rozciąganie rozcięgna, rolowanie na butelce; pyta, czy układać zestaw, czy tylko przeglądamy.
- P71 [71] „Utwórz ćwiczenie: opadanie pięty z plecakiem 5 kg, 3 s w dół, wejście zdrową nogą, 3x15 2× dziennie, ból do 4/10 dopuszczalny” → do karty trafia sama nazwa. Dawka wygenerowana: 3×12 „naprzemiennie”; „Kiedy przerwać: ostry ból” zamiast mojej reguły 4/10.
- P72 [72] AI samo generuje kroki za długie do playera (140/120) i od razu wyświetla o tym ostrzeżenie.
- P73 [73] Wygenerowana grafika: mężczyzna z plecakiem pcha ścianę – nie opadanie pięty na stopniu.
- P74 „Generuj” zużyło 9 kredytów (410→401), w rozmowie widać tylko „−1 kredyt AI”. Nie zapisałem ćwiczenia do katalogu.

## Scenariusz 16 – fizjo nietechniczny, potoczny

- (+) [74] Samo „kolano” → dobre dopytanie z chipami (uraz / po operacji / przeciążenie / bez przyczyny).
- P75 „Dla tej pani co wczoraj była, po biodrze, to samo co ma + rowerek, co drugi dzień” → „Jak nazywa się pacjentka?”. Asystent nie umie znaleźć pacjenta po rozpoznaniu, zestawie ani dacie wizyty (jest dokładnie jedna taka osoba).
- P76 [75] „Pomyłka, cofnij ostatnie wysłanie” → „nie mam takiej funkcji… napisz do niego” (pisać też się nie da). Brak cofnięcia przy realnym ryzyku pomyłek K1.

## Scenariusz 17 – neurologia i plan fazowy

- (+) [76] Udar, niedowład prawostronny: przenoszenie ciężaru, funkcja ręki, kij z asystą zdrowej ręki; uwaga o łatwiejszych wariantach.
- P77 [76] 27 minut dla pacjenta 3 mies. po udarze; guma na palce przy spastyczności; nic o roli żony/opiekuna; strona niedowładu nieodnotowana.
- P78 [77] „Progresja 8 tygodni w 4 fazach z kryteriami, fazy włączają się same” → tylko faza 1; „automatyczne przechodzenie faz ustawisz na karcie” i „kryteria wpisz do notatek planu” – takich pól w karcie nie ma (zmyślone wskazówki do interfejsu). Kryteriów nie wypisał nawet tekstem.
- P79 [77] Inwersja z taśmą 3×10 w 5. dobie po skręceniu bocznym II st. – wątpliwe klinicznie, bez zastrzeżenia.

## Scenariusz 18 – przegląd bezpieczeństwa, RODO, angielski

- (+) [78] „Osteoporoza, złamanie Th12, rozrusznik – sprawdź zestaw ćwiczenie po ćwiczeniu” → rzeczowy przegląd, wskazał deskę bokiem i wstawanie z odpychaniem, uczciwe „katalog nie zawiera danych o przeciwwskazaniach”.
- P80 Po przeglądzie nie proponuje działania (usuń/zamień) ani zapisania chorób współistniejących w karcie pacjentki – wiedza znika z końcem rozmowy.
- P81 [79] „Czy dane o zdrowiu idą do AI za granicą?” → „nie widzę, gdzie trafiają dane… sprawdź w polityce prywatności”. Uczciwe, ale to pytanie padnie w każdym gabinecie – potrzebna gotowa, zatwierdzona odpowiedź.
- P82 [80] Prośba po angielsku → odpowiedź po polsku. Tu mówi „opisy są po polsku, karta nie tłumaczy”, przy pacjentce z Ukrainy mówił „nie mam informacji” – niespójnie.
- P83 [80] Gonartroza: brak wzmacniania czworogłowego; „czwórka w leżeniu – kolano do barku”, „kolano do klatki”, „chód tyłem z otwieraniem biodra” – dobór po słowach, nie po celu.

## Scenariusz 19 – drugi pacjent z kontem (Kacper Zieliński), wszystko w jednej wiadomości

- (+) [81] „Dodaj pacjenta: imię, mail, tel, wiek, rozpoznanie… Zestaw: 4 ćwiczenia. Od dziś, 3×/tydz., 4 tyg.” → formularz wypełniony bezbłędnie (imię, nazwisko, telefon, e-mail, powód).
- P84 Reszta wiadomości (zestaw + harmonogram) znów przepada: „Na jaki problem?” + pusty zestaw. „Te cztery co wymieniłam” – odzyskuje, ale karta gubi pacjenta („Wybierz pacjenta”, choć chip w nagłówku to Kacper).
- P85 [82] K7 POTWIERDZONE drugi raz: harmonogram wpisany tekstem („od dziś, 3 razy w tygodniu, 4 tygodnie”) → zestaw od nowa, pacjent zgubiony, −1 kredyt. Do wysłania jednego planu potrzeba 2× „Wybierz pacjenta” + 3 kliknięcia harmonogramu.
- P86 „Wejście na stopień” – raz „Wejście na stopień (step-up)”, raz „…do przodu i w bok (demo)”: to samo hasło, inne ćwiczenie między rozmowami.
- (+) Aplikacja: konto połączone po e-mailu, plan widoczny od razu, „Masz 4 minuty?” = czas pierwszego ćwiczenia (przy Tomaszu „2 minuty” – czyli to nie czas zestawu; mylące).
- KOREKTA do K6: obcięcie „Tomasz Nowicki” → „Tomas Nowi” to artefakt automatu (symulator gubi ostatnie znaki przy szybkim wpisywaniu), nie literówka pacjenta. Sam mechanizm (dane z rejestracji nadpisują kartotekę fizjo) pozostaje do weryfikacji na Kacprze, który wpisał „Zielinski” bez „ń”.
- Uwaga techniczna: po wylogowaniu pole hasła w symulatorze blokowała systemowa nakładka „Automatic Strong Password” – pomogła reinstalacja aplikacji. Do sprawdzenia na prawdziwym iPhonie, czy formularz rejestracji nie koliduje z podpowiedzią silnego hasła.

## Scenariusz 20 – szablon do katalogu i pełny edytor

- P87 [83] „Szablon »Biurowy kark – 5 minut«, 4 ćwiczenia przy biurku” → nazwa „Nowy zestaw · 17.11”, 12 minut zamiast 5, ćwiczenie z hantlem w staniu bokiem do lustra („przy biurku”?). Asystent sam pisze nazwę w odpowiedzi, a karta jej nie dostaje.
- P88 [84] „Pełny edytor” otwiera się z PUSTĄ nazwą zestawu i czasem 11 min 41 s (karta: 12 min). Zamknięcie = „Porzucić zmiany?”. Jest tu ikona AI przy nazwie – osobna funkcja, niepowiązana z rozmową.

## Scenariusz 21 – „Skanuj wizytę” z obrazem

- (+) [85] Obraz karty zaleceń odczytany w całości (5 pozycji).
- (+) [86] KOREKTA do P68: dawki z dokumentu SĄ przenoszone („3 × 30 s”, „2 × 20”) – „Serie i powtórzenia z notatki, reszta z katalogu”.
- P89 KRYTYCZNE MERYTORYCZNIE [85] Łokieć tenisisty: „Ekscentryczne opuszczanie nadgarstka” → „czy chodziło o: …dłonią do góry (zginacze nadgarstka)?” – przeciwna grupa mięśni (to ćwiczenie na łokieć golfisty). Jeden klik „Tak” i pacjent dostaje złe ćwiczenie. Rozpoznanie było w dokumencie.
- P90 „Retrakcja łopatek z gumą”, „supinacja/pronacja z młotkiem” – brak w katalogu 5266 ćwiczeń? Do sprawdzenia, czy to luka katalogu, czy wyszukiwarki. Uwagi i kontrola z dokumentu pominięte. Nazwa „Nowy zestaw”.

## Scenariusz 22 – pytania o własną pracę

- P91 [87] „Podsumuj dzień: komu wysłałam zestawy, kogo dodałam, co zostało?” → „Nie widzę dziennika wysyłek ani listy dodanych dziś” + znów lista „Przypomnij”. Asystent nie pamięta własnych działań z tego samego dnia.
- P92 [88] „Które ćwiczenia są najczęściej przerywane / bolesne?” → brak danych + BŁĄD: karta „Nowe ćwiczenia” z przyciskiem „Utwórz ćwiczenie: w moim katalogu są najczęściej przerywane albo zgłaszane jako bolesne? Chcę wiedzieć co wyrzucić z szablonów” – treść pytania jako nazwa ćwiczenia.

## Scenariusz 23 – Kacper ćwiczy w aplikacji (pełne ćwiczenie + odmowa zgody + przerwanie)

- (+) [90,91] Pełny przysiad 3×10 w playerze: 4:06 przy zalecanym 4:05, fazy „Przygotuj się / Ćwicz / Odpocznij”, podpowiedzi kroków, podział „Lewa 1/2” w kolejnym ćwiczeniu. Na karcie fizjo: „Trening wykonany”, Serie 3, Powt. 30, Czas 4 min 6 s.
- P93 KRYTYCZNE (aplikacja) [92] Pacjent wybrał trudność „5 – łatwe” i wpisał komentarz („za łatwe… kolano po treningu lekko puchnie”), BEZ oceny bólu. Wyskoczyła zgoda na dane o zdrowiu; po „Anuluj” aplikacja bez słowa przeszła do następnego ćwiczenia, a komentarz i ocena trudności przepadły – fizjo nie widzi nic. Pacjent myśli, że napisał do fizjoterapeuty.
- P94 Skala bólu 1–5 („Lekko…Mocno”) nie ma opcji „nie bolało”; nie da się też odznaczyć przypadkowo klikniętej wartości bez zamykania sekcji.
- P95 [93] Przerwanie ćwiczenia w połowie: „Postęp tego ćwiczenia nie zostanie zapisany” – fizjo nie dowie się, że pacjent zaczął i zrezygnował ani dlaczego. Brak pytania „co się stało?”.
- P96 „Realizacja planu 25% (1/4)” po jednym ćwiczeniu z czterech, a status „Pacjent realizuje plan zgodnie z założeniami”.
- K6 POTWIERDZONE NA CZYSTO [94] Fizjo wpisał „Kacper Zieliński”; pacjent przy rejestracji „Zielinski” → w kartotece gabinetu jest teraz „Kacper Zielinski”. Dane z rejestracji nadpisują wpis fizjoterapeuty.
- (+) Asystent znalazł pacjenta mimo różnicy „Zieliński/Zielinski” (dopasowanie bez znaków diakrytycznych działa; przy „Tomasz Nowicki/Tomas Nowi” nie zadziałało).

## Scenariusz 24 – progresja planu

- P97 KRYTYCZNE [95] „Zamień przysiad na bułgarski albo goblet, reszta zostaje” → odpowiedź: „pozostałe ćwiczenia zostawić bez zmian”, a karta ma 3 ćwiczenia zamiast 4 – „Mostek jednonóż” zniknął po cichu. Asystent deklaruje jedno, robi drugie. Nie wysłałem.
- (+) Sam dobór progresji trafny (przysiad bułgarski z hantlami 2×8, przerwa 90 s).

Kredyty po części 2: 384/501 (łącznie 63; samo „Generuj” nowego ćwiczenia = 9).
