# Symulacja wizyt – test widoku czatu (DEV, 2026-11-01)

Rola: fizjoterapeuta w gabinecie ambulatoryjnym, pacjenci ćwiczą w domu z aplikacją.
Konto: E2E Terapeuta, org FiziYo E2E DEV (Brave). Pacjenci w org: E2E Pacjent (konto), Przemek DevTest
(konto – nie wysyłamy mu nic), Pr Bar, Arystarch Skibiński, Sergiusz Zalewski (bez konta).
Nowi pacjenci testowi mają w nazwisku przedrostek „Czat” (łatwo ich potem znaleźć i usunąć).

Każdy scenariusz: co fizjo mówi/pisze (realnie, jak między wizytami – skrótami, z odmianą, literówkami),
czego oczekuje, ile kliknięć/czasu jest akceptowalne.

## W1 – Nowy pacjent, przewlekły ból lędźwi (pierwsza wizyta)
Anna Czat-Nowak, 45 l., księgowa, ból krzyża od 6 mies., bez objawów neurologicznych.
1. „dodaj pacjentkę Anna Czat-Nowak, tel 600 100 200, ból lędźwi od pół roku, praca siedząca”
2. „ułóż jej zestaw na lędźwie, 15 minut dziennie, bez sprzętu, na początek łagodnie”
3. zmienić jedno ćwiczenie i liczbę powtórzeń, usunąć jedno
4. harmonogram 4 tygodnie, codziennie → wyślij
Oczekuję: pacjent zapisany z celem terapii/notatką, zestaw 5–7 ćwiczeń z dawką, wysłany, QR/link do aplikacji.

## W2 – Nowy pacjent po rekonstrukcji ACL (6 tydz.), zalecenia ortopedy
Marek Czat-Wiśniewski, 28 l., piłkarz amator.
1. wklejenie notatki/zaleceń ortopedy (tekst) albo „Skanuj wizytę”
2. „zestaw na kolano po ACL, faza 2, wyprost do zera, bez otwartego łańcucha 0–45°”
3. pytanie o progresję: „za 2 tygodnie dołóż przysiady”
Oczekuję: dopasowanie ćwiczeń do zaleceń, respektowanie przeciwwskazań, uczciwe „tego nie umiem”.

## W3 – Pacjent istniejący, wizyta kontrolna
E2E Pacjent (konto, plan przypisany, nie ćwiczy 19 dni).
1. „co ma E2E Pacjent i jak mu idzie?”
2. „dlaczego nie ćwiczy?” / „pokaż ból z ostatniego tygodnia”
3. „zwiększ mu powtórzenia w mostku do 15”, „zamień ćwiczenie X na łatwiejsze”
4. „przedłuż plan o 2 tygodnie”
Oczekuję: podgląd adherencji i bólu, edycja istniejącego planu bez tworzenia od zera.

## W4 – Wykorzystanie istniejącego zestawu
1. „jakie mam zestawy?”, „daj Arystarchowi ten sam zestaw co ma E2E Pacjent”
2. „przypisz Sergiuszowi zestaw na bark z katalogu”
Oczekuję: wybór z katalogu/planów innych pacjentów, kopia z możliwością korekty.

## W5 – Szablon gabinetu bez pacjenta
„zrób szablon: szyja dla pracowników biurowych, 10 minut, nazwij Szyja-biuro”
Oczekuję: zapis w katalogu organizacji, potem użycie go dla pacjenta.

## W6 – Katalog ćwiczeń i nowe ćwiczenie
1. „pokaż ćwiczenia na rotatory bez sprzętu”, „coś z gumą na pośladek średni”
2. „utwórz ćwiczenie mostek na jednej nodze” → dodać do zestawu pacjenta
Oczekuję: wyniki z obrazkiem/filmem, filtr sprzętu, dodawanie do zestawu z wyników.

## W7 – Między wizytami (zarządzanie)
1. „kto nie ćwiczy?” → przypomnij (tylko pacjentom testowym)
2. „komu kończy się plan w tym tygodniu?”
3. „co mam dziś?”

## W8 – Trudne wejścia (odporność)
- literówki i odmiana: „zestaw na kolno dla skibinskiego”, „Sergiuszowi”
- dwa zadania w jednym zdaniu
- pytanie kliniczne: „czy przy rwie kulszowej robić rozciąganie gruszkowatego?”
- polecenie spoza zakresu: „wystaw fakturę”, „umów wizytę na wtorek”
- angielskie nazwy: „clamshell, bird dog, dead bug dla Anny”
- powrót do rozmowy po przejściu do karty pacjenta, edycja wcześniejszej wiadomości, Stop
- bez AI (przełącznik AI) – te same polecenia na regułach
