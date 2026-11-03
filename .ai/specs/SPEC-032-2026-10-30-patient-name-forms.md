---
spec: SPEC-032
repo: cross-repo
issues: []
prs: []
board: BW-FZ-47
---

# Formy imion pacjentów ze słownika

## Cel

Czat (SPEC-031) rozpoznaje pacjenta po imieniu w odmianie („przypisz Kowalskiemu”, „dla Ani”) w dwóch miejscach: dyspozytor reguł w panelu (`utils/textMatch.ts`) wybiera pacjenta do karty, a `ChatPatientPseudonymizer` w `fizjo-app` zamienia imiona na aliasy, zanim tekst trafi do modelu. Dziś oba wyprowadzają końcówki ręcznymi regułami z samego imienia. Polska odmiana imion się w nich nie mieści: każda poprawka przesuwa granicę (Antonia/Antoni, Mario/Maria, Henio/Antonio, Ida/„idę”), a review w #139 i fizjo-app#212 znajdowało kolejne pary przez kilkanaście rund. Decyzja Adama 30.10: zamrozić reguły, zamknąć temat słownikiem w osobnym PR.

Miarą jest brak pomyłki osoby: karta nie wskazuje pacjenta, którego terapeuta nie wymienił, a imię pacjenta nie trafia do modelu.

## Decyzje

1. **Słownik form zamiast reguł.** Źródłem jest `morfologik-polish` 2.2.0 z Maven Central (PoliMorf 2.1, licencja BSD-2, plik licencji jedzie z danymi). Ze słownika bierzemy rzeczowniki z lematem z wielkiej litery (imiona, nazwiska, miejsca): około 33 tys. lematów i 250 tys. form po normalizacji, 1,6 MB tekstu i około 180 KB gzip w formacie „lemat, formy jako sufiksy”. Słownik daje formy, których reguły nie znają (Idzie, Magdzie, Brunie, Kseni) i nie daje form obcego imienia (Wiktor nie ma „wiktoria”, Antoni nie ma „antonia”).
2. **Reguły tylko jako zapas.** Gdy imienia nie ma w słowniku (Mario, Mia, rzadkie nazwiska), działa obecna funkcja końcówek bez zmian. Reguły nie są już rozwijane; nowy przypadek to wpis w pliku przypadków albo uzupełnienie danych.
3. **Różna tolerancja w panelu i backendzie.** Koszt pomyłki jest inny, więc i reguła jest inna.
   - Backend (pseudonimizacja) woli zamaskować za dużo niż wypuścić imię: każda forma ze słownika albo z reguł dostaje alias, także gdy to zwykłe słowo („idę” przy Idzie). Fałszywy alias jest nieszkodliwy, bo walidator i tak przyjmuje tylko aliasy aktywnych pacjentów.
   - Panel (wybór pacjenta do karty) woli zapytać niż wskazać złą osobę: forma, która jest też zwykłym słowem (lista kolizji generowana ze słownika: „ani”, „idę”, „ale”, „maj”; około 42 tys. form), trafia tylko wtedy, gdy w tekście jest napisana wielką literą. Tokenizer w panelu zachowuje więc oryginalną wielkość liter obok formy znormalizowanej.
4. **Niejednoznaczność zostaje w danych.** Forma może należeć do kilku lematów („jasia” → Jasia, Jasio, Jaś). Dopasowujemy do każdego pacjenta, którego imię ma tę formę; dwóch takich pacjentów daje istniejące `many` i kartę „O kogo chodzi?”.
5. **Jeden kanon danych i przypadków.** Kanon żyje w `fizjo-app`:
   - `backend/FizjoApp.Api/Chat/Dispatch/Data/name-forms.tsv` (+ `name-forms.LICENSE.txt`), osadzony jako zasób,
   - `backend/FizjoApp.Api/Chat/Dispatch/Data/name-collisions.txt`,
   - `backend/FizjoApp.Api.Tests/Chat/Dispatch/name-match-cases.json`: `{ name, text, panel, backend }`, gdzie `panel` i `backend` to oczekiwany wynik dopasowania dla każdej strony.
     Generator `scripts/name-forms/` w `fizjo-app` (Java: zrzut słownika przez `morfologik-stemming`, Node: normalizacja tak jak `normalizeSearchText`, kompresja, kolizje) uruchamia człowiek przy zmianie wersji słownika. Panel trzyma kopie z nagłówkiem SHA, odświeżane rozszerzonym `npm run docs:sync`; Vitest i xUnit czytają ten sam plik przypadków, więc parytet pilnuje test, nie ręczne lustro.
6. **Ładowanie w panelu.** Dane ładuje dynamiczny import tylko w widoku czatu; mapa form budowana jest raz, leniwie, dla imion pacjentów z listy organizacji, nie dla całego słownika.

## Poza zakresem

Imiona w treści zwracanej przez model, pacjenci spoza organizacji (backend i tak ich nie widzi), pseudonimizacja poza czatem.

## Kolejność

1. `fizjo-app`: generator, dane, plik przypadków (przenosi obecne `InlineData` z `ChatPatientPseudonymizerTests`), pseudonimizator na słowniku. Test xUnit iteruje `name-match-cases.json`.
2. Panel: kopie danych przez `docs:sync`, tokenizer z wielkością liter, `nameWordMatches` na słowniku z listą kolizji, Vitest na tym samym pliku przypadków (przenosi przypadki imion z `patientMatch.test.ts`).

## Verification plan

- Plik przypadków zawiera wszystkie pary z review #139 i fizjo-app#212 (Karol/Karoliny, Wiktor/Wiktoria, Kamil/Kamila, Antoni/Antonia/Antonio, Maria/Mario, Kowalski/Kowalska, Julia/Juli, Hania, Basia, Ksenia, Bruno, Jasio, Henio, Ania, Asia, Mia/„mi”, Ida/„idę”/„Idzie”, Magda/„Magdzie”, Maja/„maj”, „ale”) z osobnym wynikiem dla panelu i backendu; oba testy padają na kodzie sprzed zmiany dla przypadków słownikowych.
- Vitest: tokenizer z wielkością liter, lista kolizji (małą literą nie trafia, wielką trafia), zapas reguł dla imienia spoza słownika.
- xUnit: pseudonimizacja maskuje kolizję („idę” przy Idzie dostaje alias).
- Rozmiar: chunk danych w buildzie panelu poniżej 250 KB gzip i poza bundlem startowym.
- E2E: bez zmian w `fiziyo-tests` (czat jest za przełącznikiem i nie ma scenariuszy); `data-testid` bez zmian.

## Changelog

### 2026-10-30

- Spec po decyzji o zamrożeniu reguł końcówek w #139 i fizjo-app#212.
